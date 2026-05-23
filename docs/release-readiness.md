# Kelunia release readiness

Use this checklist before a public launch or store submission.

## Code gates

- `npm run lint`
- `npm run build`
- `npx cap sync ios`
- `npx cap sync android`
- Deploy Firestore/Storage rules after rule changes.
- Deploy Functions after email/auth/claim changes.

## Firebase console

- Authentication password policy: minimum 8 characters, require letters and numbers.
- Authorized domains: `www.kelunia.com`, `kelunia.com`, and the Firebase auth domain.
- App Check providers:
  - Web/PWA: reCAPTCHA v3 for the production domain.
  - iOS: App Attest, with DeviceCheck fallback if needed.
  - Android: Play Integrity.
- App Check enforcement: enable for Firestore, Storage, and Cloud Functions after testing on real devices.
- Firestore backup: schedule regular exports or keep a documented manual export routine.

## Native release

- iOS: confirm bundle id, signing team, version, build number, icon, splash, and real-device login.
- Android: confirm application id, versionCode, versionName, icon, splash, release signing, and real-device login.
- Test safe areas on iPhone with notch, Android gesture navigation, tablet, and desktop PWA.

## Manual smoke test

- Register trial account and verify email.
- Register with license code and verify email.
- Login/logout/password reset.
- Create, edit, delete booking.
- Tap empty day, one-booking day, and multi-booking day in month calendar.
- Create/edit/delete room and group, including group colors.
- Create/edit/delete fixed schedule.
- Invite member with access code.
- Confirm audit log shows actor name and email.
- Confirm read-only behavior when license/trial is inactive.
