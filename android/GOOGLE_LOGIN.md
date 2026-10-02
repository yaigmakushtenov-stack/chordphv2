# Google native login setup

Android login uses `@capgo/capacitor-social-login` 8.5.12 with Capacitor 8.5.2.
The native Google account picker returns an ID token. The hosted web client
submits that token to Better Auth 1.7.5, which verifies Google's signature,
issuer, audience, expiry, and the supplied nonce before creating the ChordPH
session cookie. Browser login continues using the existing Google redirect.

## Google Cloud Console

1. Open https://console.cloud.google.com/ and select the same project that
   contains the web OAuth client used by ChordPH.
2. Open **Google Auth Platform**. If setup is incomplete, configure the app's
   branding as ChordPH, a support email, and developer contact information.
   For a public app, select an external audience. While testing, add your
   Google account and your testers under **Audience > Test users**.
3. Open **Clients** and find the existing **Web application** OAuth client.
   Its client ID must match `GOOGLE_CLIENT_ID` on Vercel. The native SDK uses
   this same web client ID as its server audience; the Android client ID is
   registered in Google Cloud but is not entered into the app's configuration.
4. For browser login, confirm the web client's authorized redirect URI is
   `https://chordph.vercel.app/api/auth/callback/google`. Preserve any existing
   local-development redirect URIs. If using JavaScript origins, the hosted
   origin is `https://chordph.vercel.app`, without a path.
5. Under **Clients**, choose **Create client**, select **Android**, and enter:

   | Field | Value |
   | --- | --- |
   | Name | ChordPH Android Debug |
   | Package name | `com.chordph.app` |
   | SHA-1 certificate fingerprint | `7C:32:49:22:07:28:C4:6B:2B:2B:45:9B:E9:0A:4C:C8:ED:F5:0C:19` |

   This fingerprint was obtained from this machine's debug signing certificate.
   A different signing key requires its own registered fingerprint.
6. Create the Android client. Keep both web and Android clients in the same
   Google Cloud project. Google notes that client-setting changes can take
   five minutes to a few hours to propagate.

Authentication requests only the default identity scopes: OpenID, email, and
profile. This integration does not use Firebase or require
`google-services.json`, a native client secret, or a custom deep-link callback.

## Vercel and installation

Confirm these existing server environment variables in the production
deployment:

| Variable | Value |
| --- | --- |
| `BETTER_AUTH_URL` | `https://chordph.vercel.app` |
| `GOOGLE_CLIENT_ID` | The web OAuth client ID from the selected Google Cloud project |
| `GOOGLE_CLIENT_SECRET` | The matching web OAuth client secret, kept server-only |
| `BETTER_AUTH_SECRET` | The existing application authentication secret |

The login and signup pages pass only the public web client ID to the button.
The web client secret remains on the server. No new `NEXT_PUBLIC_` variable
or additional Android client ID environment variable is required.

Deploy the updated website to Vercel through your normal process, then install
the updated debug APK. Both changes are needed: the APK contains the native
plugin, and the hosted website contains the button that calls it. Building an
APK alone does not deploy the website.

To rebuild, select JDK 21 for Gradle and run `pnpm android:build` from the
repository root. The APK is at
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Verify on a device

- Use a device or emulator with Google Play services and a Google account.
- Tap Continue with Google on login or signup and select an account in the
  native Google picker. Confirm that the app opens the authenticated dashboard.
- Cancel the picker and confirm the button becomes usable again.
- Close and reopen the app and confirm the ChordPH session persists.
- Log out and confirm protected pages require authentication again. The app
  session ends; logging out of ChordPH does not remove the Google account from
  Android.
- Verify browser Google login still follows its existing redirect flow.

If native sign-in fails, check the selected Cloud project, the package name,
the APK signing fingerprint, Google Play services, and the web client ID.
If the native picker succeeds but ChordPH login fails, check the production
deployment and that Better Auth uses the same web client ID as the SDK.
An older APK without the plugin displays an update message.

## Before a release

Create Android OAuth clients for the actual release signing certificates.
For Google Play App Signing, register the app-signing certificate SHA-1 shown
in Play Console; it may differ from the upload key and this debug certificate.
Register the appropriate release-key fingerprint for APKs distributed outside
Google Play. Complete the Google Auth Platform publishing configuration for
the intended audience before public distribution.

## References

- [Google Cloud OAuth clients](https://support.google.com/cloud/answer/15549257)
- [Google Auth Platform audience](https://support.google.com/cloud/answer/15549945)
- [Android native Google sign-in](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
- [Capgo Android Google setup](https://capgo.app/docs/plugins/social-login/google/android/)
- [Better Auth Google ID-token sign-in](https://better-auth.com/docs/authentication/google)
