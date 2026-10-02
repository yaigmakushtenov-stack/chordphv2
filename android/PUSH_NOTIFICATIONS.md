# Android push notifications

ChordPH uses Capacitor Push Notifications 8.1.2 and Firebase Admin 14.5.0. Web push and the in-app inbox are outside this implementation.

## Firebase setup

1. Create or select a Firebase project and register an Android app with package name `com.chordph.app`.
2. Download that app's `google-services.json` into `android/app/google-services.json`. This file is ignored by Git. It must belong to the same Firebase project used by the server.
3. Enable the Firebase Cloud Messaging HTTP v1 API. Configure a service account authorized to send FCM messages for that project.
4. Set these server-only environment variables locally and on the deployed Next.js server:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (PEM; literal `\n` separators are supported)
   - `PUSH_DISPATCH_SECRET` (a separate, long random secret for the delivery worker)

Never put service-account credentials in the Android app, client code, or a `NEXT_PUBLIC_` variable. Never commit a service-account key file.

## Database and application rollout

The Prisma schema adds notification preferences, Android devices, notification records, and per-device deliveries. Apply this schema through the project's approved database process before deploying the updated application. No migration files were created and no database changes were applied by this implementation. Existing band-add and event-create transactions now depend on these tables.

Run `pnpm db:generate`, `pnpm lint`, and `pnpm build`. With the Firebase Android configuration in place, run `pnpm android:build` and install the rebuilt APK. Existing APKs cannot gain the native plugin from a website deployment. The Android wrapper still loads the HTTPS server configured in `capacitor.config.json`.

Use JDK 21 for Android builds. The checked-in Gradle 8.14.3 wrapper does not run on the installed Java 25 runtime (`Unsupported class file major version 69`); point `JAVA_HOME` to a JDK 21 installation for the build. This implementation does not change your system Java installation or Gradle version.

Open Settings in the Android app and select **Enable on this device**. Android 13 and newer ask for notification permission. Choose the two notification categories and save preferences. Registration resumes on app navigation, foregrounding, and network recovery after opting in; an old APK shows an update message.

## Notification behavior

- Adding a registered ChordPH user to a band preserves the existing immediate `ACCEPTED` membership behavior. The added user receives **You were added to a band**. This does not implement an invitation acceptance workflow.
- Creating an event with a band selected notifies its other accepted members only when the creator's verified band role is `OWNER`. Personal events and events created by moderators or members do not generate this notification. Assigning an existing event or playlist to a band is not a new-event trigger.
- Category preferences apply to all of the user's Android devices. The enable/disable button affects the current device session.
- Notification records are saved even when the user has no registered device or has opted out of push, to support the later in-app inbox. Enabling a device does not send historical notifications.
- Device registrations belong to authenticated sessions. Logout or session revocation deletes registrations through database cascading; expired sessions are excluded from sending. Token rotation replaces the previous token for that session. Notification taps accept only internal band/event destinations and the intended recipient.
- Push notifications show in the foreground and background using the `band_activity` channel. Android lock-screen content is private. Users can also disable this channel in Android settings.

## Delivery recovery

Notifications and delivery work are saved in the same transaction as the domain change. A bounded worker runs after the action response, without making Firebase availability determine whether the band addition or event succeeds.

Configure an external scheduler to call `GET /api/notifications/dispatch` every minute with `Authorization: Bearer <PUSH_DISPATCH_SECRET>`. No scheduler was provisioned. The endpoint fails closed without the secret and returns 503 when server Firebase credentials are missing. It processes up to 100 deliveries per call; additional calls may be needed for higher volume.

Workers claim deliveries with a five-minute lease. Known transient Firebase failures retry with exponential backoff, for up to five attempts within 24 hours. Invalid tokens are removed; other provider errors are terminal. Session validity, recipient ownership, category preferences, and current accepted band membership are rechecked before sending. Unexpected worker failures retain queued work until lease recovery and emit a safe incident identifier without tokens or credentials.

Delivery is at least once: a crash after Firebase accepts a message but before its result is saved can cause a retry. A stable Android notification tag replaces the tray entry for that notification. Push already accepted by Firebase can arrive after logout or a preference change; neither Android nor FCM guarantees immediate delivery. Credentials and provider errors must be monitored during rollout.

## Verification

Run `node --test tests/push-notifications.test.mjs` for isolated server behavior checks. These use mocked database and Firebase clients; they do not establish live-device delivery.

On actual Android devices verify:

1. Enable, deny, and revoke notification permission; save both categories independently.
2. Add a user to a band: only the added user receives a notification and tapping it opens that band.
3. Create a band event as an owner: other accepted members receive it. Repeat as a member/moderator and for a personal event: no band push is sent.
4. Verify foreground, background, and cold-start notification taps.
5. Disable a category/device; log out, switch accounts, and revoke a session. Verify future sends exclude those registrations and recipients.
6. Exercise transient failure recovery through the dispatch endpoint; verify invalid tokens are removed and successful devices are not retried.

References: [Capacitor push notifications](https://capacitorjs.com/docs/apis/push-notifications), [Firebase server messaging](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk), [FCM token management](https://firebase.google.com/docs/cloud-messaging/manage-tokens).
