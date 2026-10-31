/**
 * One-time administrative script: Reconcile user document tiers and fields
 * 
 * Usage:
 *   node scripts/reconcile-tiers.cjs          (Dry-run mode by default)
 *   node scripts/reconcile-tiers.cjs --apply  (Execute database updates)
 */

try { require('dotenv').config(); } catch {}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isApply = process.argv.includes('--apply');

// Load Service Account
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(os.homedir(), 'Downloads', 'axe-hours-youtube-engine-firebase-adminsdk-fbsvc-3f311771b7.json');
if (!fs.existsSync(saPath)) {
  console.error('[reconcile-tiers] Service account file not found at:', saPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

// SERVER_SECRET for betaSignature generation
const SERVER_SECRET = process.env.SERVER_SECRET || process.env.GUEST_TOKEN_SECRET || 'secret';

// Load allowlist of UIDs to keep on Pro (checks scripts/pro-allowlist.json or ./pro-allowlist.json)
let allowlistUids = new Set();
const candidatePaths = [
  path.resolve(process.cwd(), 'scripts', 'pro-allowlist.json'),
  path.resolve(process.cwd(), 'pro-allowlist.json'),
  path.resolve(__dirname, 'pro-allowlist.json')
];
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(raw) && raw.length > 0) {
        allowlistUids = new Set(raw.filter(id => typeof id === 'string' && id.trim()));
        break;
      }
    } catch (e) {
      console.warn(`[reconcile-tiers] Error reading allowlist at ${p}:`, e.message);
    }
  }
}

// Whitelisted profile keys matching firestore.rules isValidUser hasOnly
const ALLOWED_PROFILE_KEYS = new Set([
  'uid',
  'email',
  'name',
  'handle',
  'avatar',
  'bio',
  'customInstructions',
  'createdAt',
  'updatedAt',
  'role',
  'tier',
  'plan',
  'betaSignature'
]);

async function reconcile() {
  console.log(`\n========================================`);
  console.log(`  Tier & Schema Reconciler (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
  console.log(`========================================`);
  console.log(`Allowlisted Pro UIDs count: ${allowlistUids.size}`);

  const usersSnap = await db.collection('users').get();
  console.log(`Total user documents scanned: ${usersSnap.size}`);

  let allowlistedKeptCount = 0;
  let demotedToFreeCount = 0;
  let alreadyCompliantCount = 0;

  const unexpectedFieldsMap = new Map(); // fieldName -> count
  let docsWithUnexpectedFieldsCount = 0;

  const operations = [];

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data();

    const currentTier = data.tier;
    const currentRole = data.role;
    const currentPlan = data.plan;
    const currentSig = data.betaSignature;

    const isPaid = (
      currentTier === 'pro' || currentTier === 'agency' ||
      currentRole === 'Pro Creator' || currentRole === 'Agency' || currentRole === 'agency' ||
      currentPlan === 'pro' || currentPlan === 'agency'
    );

    let hasValidSig = false;
    if (currentSig && typeof currentSig === 'string' && currentSig.length === 64) {
      const proSig = crypto.createHmac('sha256', SERVER_SECRET).update(`${uid}_beta_pro_v1`).digest('hex');
      const agencySig = crypto.createHmac('sha256', SERVER_SECRET).update(`${uid}_beta_agency_v1`).digest('hex');
      hasValidSig = (currentSig === proSig || currentSig === agencySig);
    }

    const updates = {};
    const fieldsToDelete = [];

    // 1. Reconcile Tiers
    if (allowlistUids.has(uid)) {
      // User is on allowlist: ensure valid Pro tier & signature
      const validSig = crypto.createHmac('sha256', SERVER_SECRET).update(`${uid}_beta_pro_v1`).digest('hex');
      if (currentTier === 'pro' && currentRole === 'Pro Creator' && currentPlan === 'pro' && currentSig === validSig) {
        alreadyCompliantCount++;
      } else {
        updates.tier = 'pro';
        updates.role = 'Pro Creator';
        updates.plan = 'pro';
        updates.betaSignature = validSig;
        updates.updatedAt = new Date().toISOString();
        allowlistedKeptCount++;
      }
    } else if (isPaid && !hasValidSig) {
      // Unsigned paid user: demote to Free Starter
      updates.tier = 'free';
      updates.plan = 'free';
      updates.role = 'Creator';
      updates.updatedAt = new Date().toISOString();
      if (data.betaSignature !== undefined) {
        fieldsToDelete.push('betaSignature');
      }
      demotedToFreeCount++;
    } else {
      alreadyCompliantCount++;
    }

    // 2. Check for unexpected fields outside isValidUser hasOnly whitelist
    let docHadUnexpected = false;
    for (const key of Object.keys(data)) {
      if (!ALLOWED_PROFILE_KEYS.has(key)) {
        docHadUnexpected = true;
        fieldsToDelete.push(key);
        unexpectedFieldsMap.set(key, (unexpectedFieldsMap.get(key) || 0) + 1);
      }
    }
    if (docHadUnexpected) {
      docsWithUnexpectedFieldsCount++;
    }

    // Prepare batch write payload if changes needed
    if (Object.keys(updates).length > 0 || fieldsToDelete.length > 0) {
      for (const field of fieldsToDelete) {
        updates[field] = FieldValue.delete();
      }
      operations.push({ ref: docSnap.ref, updates });
    }
  }

  console.log(`\n--- Tier Reconcile Summary ---`);
  console.log(`Allowlisted Pro accounts signed: ${allowlistedKeptCount}`);
  console.log(`Unsigned paid accounts reset to Free: ${demotedToFreeCount}`);
  console.log(`Already compliant accounts: ${alreadyCompliantCount}`);

  console.log(`\n--- Schema Sanitization Summary ---`);
  console.log(`Documents with unexpected fields: ${docsWithUnexpectedFieldsCount}`);
  if (unexpectedFieldsMap.size === 0) {
    console.log(`No unexpected fields found.`);
  } else {
    console.log(`Unexpected fields detected:`);
    for (const [field, count] of unexpectedFieldsMap.entries()) {
      console.log(`  - "${field}": ${count} document(s)`);
    }
  }

  console.log(`\nTotal documents requiring updates: ${operations.length}`);

  if (isApply && operations.length > 0) {
    console.log(`\nApplying updates to Firestore...`);
    const batchSize = 400;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = db.batch();
      const chunk = operations.slice(i, i + batchSize);
      for (const op of chunk) {
        batch.update(op.ref, op.updates);
      }
      await batch.commit();
    }
    console.log(`Successfully applied updates to ${operations.length} document(s).`);
  } else if (!isApply && operations.length > 0) {
    console.log(`\n[DRY RUN] No changes were written. Run with --apply to execute.`);
  } else {
    console.log(`\nAll user documents are already in perfect compliance.`);
  }
}

reconcile().catch(console.error);

