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
