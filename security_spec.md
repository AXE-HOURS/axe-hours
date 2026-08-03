# Security Specification: Dispatched Scripts Sub-collection

This document specifies the security requirements, data invariants, and access control policies for the `dispatched_scripts` user sub-collection.

## 1. Data Invariants
- **Owner Separation**: A dispatched script must reside within the authenticated user's sub-collection (`/users/{userId}/dispatched_scripts/{scriptId}`).
- **Strict Fields**: Every script document must contain exactly six fields: `uid`, `title`, `scriptBody`, `angleType`, `productionStatus`, and `createdAt`. No ghost or shadow fields are permitted.
- **Role Verification**: Only the authenticated user matching `{userId}` and the field `uid` can read or write documents.
- **Finite States**: The `productionStatus` must strictly be one of `Draft`, `Ready to Shoot`, or `Produced`.
- **System Integrity**: Timestamps (`createdAt`) must be a valid server-side timestamp or ISO string.

## 2. The "Dirty Dozen" Payloads (Denial Scenarios)

The following payloads must be rejected by Firestore Security Rules:

1. **Spoofed User ID**: Authenticated user trying to save a script with a `uid` belonging to another user.
2. **Missing required title**: Saving a script without the `title` field.
3. **Missing required scriptBody**: Saving a script without `scriptBody`.
4. **Missing required angleType**: Saving a script without `angleType`.
5. **Invalid status**: Setting `productionStatus` to "Completed" or any value not in `['Draft', 'Ready to Shoot', 'Produced']`.
6. **Shadow field injection**: Including a "Ghost Field" (e.g., `isPremium: true`) to bypass schema validations.
7. **Size limit violation**: Injecting an oversized title (exceeding 1000 characters).
8. **Invalid document ID**: Writing to a script ID containing illegal characters or oversized length.
9. **Unauthenticated write**: Attempting to write a script with `auth == null`.
10. **Writing to other user's path**: Authenticated User A attempting to write under `users/UserB/dispatched_scripts/script1`.
11. **Reading other user's path**: Authenticated User A attempting to get or list under `users/UserB/dispatched_scripts/`.
12. **Modifying uid after creation**: Attempting to update `uid` to a different user's ID during update.

## 3. Test Runner Definition (Verification Framework)

```typescript
// firestore.rules.test.ts (Conceptual representation)
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// All the above 12 dirty payloads will return PERMISSION_DENIED.
```
