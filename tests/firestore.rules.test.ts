import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'axe-hours-test';
const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('User Profile Creation (users/{userId})', () => {
    it('MUST DENY: create a user doc with tier "agency"', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice',
          handle: 'alice',
          tier: 'agency',
        })
      );
    });

    it('MUST DENY: create a user doc with role "Pro Creator"', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice',
          handle: 'alice',
          role: 'Pro Creator',
        })
      );
    });

    it('MUST DENY: create a user doc with betaSignature', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice',
          handle: 'alice',
          betaSignature: 'forged_server_signature_12345',
        })
      );
    });

    it('MUST DENY: create with plan "pro"', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice',
          handle: 'alice',
          plan: 'pro',
        })
      );
    });

    it('MUST DENY: create with an unknown field "isAdmin": true', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice',
          handle: 'alice',
          isAdmin: true,
        })
      );
    });

    it('MUST ALLOW: create with only name, handle and avatar (no paid/role fields)', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertSucceeds(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice Creator',
          handle: 'alice_creator',
          avatar: 'https://example.com/avatar.png',
        })
      );
    });
  });

  describe('User Profile Update (users/{userId})', () => {
    beforeEach(async () => {
      // Seed a legitimate user doc via withSecurityRulesDisabled
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const seedRef = doc(context.firestore(), 'users', 'user_alice');
        await setDoc(seedRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice Creator',
          handle: 'alice_creator',
          bio: 'Initial Bio',
          customInstructions: '',
          role: 'Creator',
          tier: 'free',
          betaSignature: 'legit_signature',
        });
      });
    });

    it('MUST DENY: client updating role', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        updateDoc(userRef, {
          role: 'Agency',
        })
      );
    });

    it('MUST DENY: client updating tier', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        updateDoc(userRef, {
          tier: 'pro',
        })
      );
    });

    it('MUST DENY: client updating plan', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        updateDoc(userRef, {
          plan: 'pro',
        })
      );
    });

    it('MUST DENY: client updating betaSignature', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertFails(
        updateDoc(userRef, {
          betaSignature: 'tampered_signature',
        })
      );
    });

    it('MUST ALLOW: client updating bio or customInstructions', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      await assertSucceeds(
        updateDoc(userRef, {
          bio: 'Updated Creator Bio for YouTube videos',
          customInstructions: 'Speak casually and punchy.',
        })
      );
    });

    it('MUST ALLOW: updating existing profile when re-sending full profile data with only bio changed', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const userRef = doc(aliceContext.firestore(), 'users', 'user_alice');

      // Re-send entire existing profile model (including role, tier, betaSignature unchanged), modifying only bio
      await assertSucceeds(
        setDoc(userRef, {
          uid: 'user_alice',
          email: 'alice@example.com',
          name: 'Alice Creator',
          handle: 'alice_creator',
          bio: 'Updated creator bio re-sending complete profile model',
          customInstructions: '',
          role: 'Creator',
          tier: 'free',
          betaSignature: 'legit_signature',
          createdAt: '2026-10-30T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('MUST ALLOW: stored user doc has tier "pro", client updateDoc modifies ONLY bio and updatedAt', async () => {
      // Seed a user doc with tier: 'pro'
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const proRef = doc(context.firestore(), 'users', 'user_pro');
        await setDoc(proRef, {
          uid: 'user_pro',
          email: 'pro@example.com',
          name: 'Pro Creator',
          handle: 'pro_creator',
          bio: 'Initial Pro Bio',
          role: 'Pro Creator',
          tier: 'pro',
          plan: 'pro',
          betaSignature: 'server_sig_123',
          createdAt: '2026-10-30T00:00:00.000Z',
          updatedAt: '2026-10-30T00:00:00.000Z',
        });
      });

      const proContext = testEnv.authenticatedContext('user_pro', { email: 'pro@example.com' });
      const userRef = doc(proContext.firestore(), 'users', 'user_pro');

      // Client calls updateDoc sending ONLY editable fields (bio, updatedAt) without touching tier
      await assertSucceeds(
        updateDoc(userRef, {
          bio: 'Updated bio via isolated fields',
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('MUST DENY: stored user doc has tier "pro", client attempts to overwrite tier with "free" via setDoc or updateDoc', async () => {
      // Seed a user doc with tier: 'pro'
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const proRef = doc(context.firestore(), 'users', 'user_pro');
        await setDoc(proRef, {
          uid: 'user_pro',
          email: 'pro@example.com',
          name: 'Pro Creator',
          handle: 'pro_creator',
          bio: 'Initial Pro Bio',
          role: 'Pro Creator',
          tier: 'pro',
          plan: 'pro',
          betaSignature: 'server_sig_123',
          createdAt: '2026-10-30T00:00:00.000Z',
          updatedAt: '2026-10-30T00:00:00.000Z',
        });
      });

      const proContext = testEnv.authenticatedContext('user_pro', { email: 'pro@example.com' });
      const userRef = doc(proContext.firestore(), 'users', 'user_pro');

      // Attempting to overwrite tier to 'free' via updateDoc MUST be denied
      await assertFails(
        updateDoc(userRef, {
          bio: 'Attempted downgrade bio',
          tier: 'free',
          updatedAt: new Date().toISOString(),
        })
      );

      // Client calls setDoc with tier: "free" over stored "pro" -> MUST be denied
      await assertFails(
        setDoc(userRef, {
          uid: 'user_pro',
          email: 'pro@example.com',
          name: 'Pro Creator',
          handle: 'pro_creator',
          bio: 'Attempted overwrite bio',
          role: 'Creator',
          tier: 'free',
          updatedAt: new Date().toISOString(),
        })
      );
    });
  });

  describe('Internal Server Collections Lockdown', () => {
    it('MUST DENY: any client read or write of server_usage_quotas', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const quotaRef = doc(aliceContext.firestore(), 'server_usage_quotas', 'user_alice_2026_10_30');

      // Client write must fail
      await assertFails(
        setDoc(quotaRef, {
          extractions: 0,
          generations: 0,
        })
      );

      // Client read must fail
      await assertFails(getDoc(quotaRef));

      // Unauthenticated client read/write must also fail
      const anonContext = testEnv.unauthenticatedContext();
      const anonQuotaRef = doc(anonContext.firestore(), 'server_usage_quotas', 'ip_test_2026_10_30');
      await assertFails(setDoc(anonQuotaRef, { extractions: 0 }));
      await assertFails(getDoc(anonQuotaRef));
    });

    it('MUST DENY: any client read or write of transcript_cache', async () => {
      const aliceContext = testEnv.authenticatedContext('user_alice', { email: 'alice@example.com' });
      const cacheRef = doc(aliceContext.firestore(), 'transcript_cache', 'dQw4w9WgXcQ');

      // Client write must fail
      await assertFails(
        setDoc(cacheRef, {
          videoId: 'dQw4w9WgXcQ',
          lines: [],
        })
      );

      // Client read must fail
      await assertFails(getDoc(cacheRef));

      // Unauthenticated client read/write must also fail
      const anonContext = testEnv.unauthenticatedContext();
      const anonCacheRef = doc(anonContext.firestore(), 'transcript_cache', 'dQw4w9WgXcQ');
      await assertFails(setDoc(anonCacheRef, { lines: [] }));
      await assertFails(getDoc(anonCacheRef));
    });
  });
});
