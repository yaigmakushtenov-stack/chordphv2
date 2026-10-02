# ChordPH Android wrapper

This Capacitor 8.5.2 app loads `https://chordph.vercel.app` in an Android
WebView. The application ID is `com.chordph.app`. Next.js and its backend
continue running on Vercel; no Next.js static export is needed.

## Requirements

- Node.js 22 or newer and the project's pnpm version.
- Android Studio, Android SDK 36, and JDK 21 for Gradle 8.14.3.
- Set `JAVA_HOME` to your JDK and `ANDROID_HOME` to your Android SDK, or
configure the SDK through Android Studio's local project settings. Android
Studio installations bundled with Java 25 need a separate JDK 21 selected
for this project's Gradle build.

## Build and run

Run these commands from the repository root:

```sh
pnpm android:build
pnpm android:open
```

The build command syncs Capacitor and creates a debug APK at
`android/app/build/outputs/apk/debug/app-debug.apk`.
The successful build also copies the APK to `public/downloads/chordph.apk`
for the website's install buttons on login, dashboard, and sidebar. These
buttons download the APK; Android handles installation after the download.
They are hidden inside the native app. Deploy the refreshed public file with
the website to update the download. This currently distributes the debug APK;
replace it with a release-signed build before public release.

The open command syncs
the project and opens Android Studio, where you can run it on a device or
emulator. Debug APKs are for testing, not store distribution.

Use `pnpm android:sync` after changing `capacitor.config.json`, files in
`native-web`, or native plugins. Copied assets and generated configuration
are ignored by Git; keep their source files in the repository.

## Scope and verification

The wrapper requires internet access. Its packaged connection-error page
provides a retry link when the main page cannot load. External origins use
Android's external URL handler; no wildcard navigation access is configured.
Android back navigation goes through WebView history and exits at the root.

Native Google login uses the Android account picker and exchanges Google's
ID token through Better Auth on the hosted website. Follow
[the Google login setup guide](GOOGLE_LOGIN.md) before testing. Deploy the web
changes and install an APK containing the SocialLogin plugin together.
Launcher and splash artwork currently use Capacitor's defaults.

Before release, verify launch, connection failure and retry, Android back
navigation, keyboard and system-bar layout, file selection, media playback,
external links, and resume after backgrounding on actual devices. Verify native
login, cancellation, session persistence after restart, and logout. Release
signing is separate follow-up work.

Capacitor documents `server.url` as intended for live reload and not intended
for production: https://capacitorjs.com/docs/config. This project deliberately
uses it for the hosted-site wrapper requested for the initial Android build.
