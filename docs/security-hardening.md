# Kelunia security hardening

## Deployed from code

- Firestore and Storage rules require `email_verified == true` for application data reads and writes.
- New accounts can still create their initial profile and claim a valid invite/license code before verification, so the email verification flow is not blocked.
- Login blocks unverified accounts and resends the verification email.
- Password creation and password changes require at least 8 characters, with letters and digits, and cannot contain the main part of the email address.
- Cloud Functions sync `role`, `isOwner`, `locationId`, and `locationSetupRequired` into Firebase Auth custom claims whenever a user profile document changes.

## Firebase Console settings still required

- Authentication > Settings > Password policy: set minimum length to 8 and require letters and numbers.
- App Check:
  - Web/PWA: enable reCAPTCHA v3 with the production domain.
  - iOS: enable App Attest, with DeviceCheck fallback if needed.
  - Android: enable Play Integrity.
- App Check enforcement: turn on enforcement for Firestore, Storage, and Cloud Functions after testing on real devices.
- Deploy rules and functions after Firebase login:

```bash
npx firebase-tools deploy --only firestore:rules,storage:rules,functions
```

## Operational notes

- Existing users receive custom claims the next time their `users/{uid}` document is written. If you want all existing users updated immediately, touch/resave their user documents or run a one-off admin backfill.
- After custom claims change, a user may need to sign out and sign back in so the client receives a fresh Firebase ID token.
