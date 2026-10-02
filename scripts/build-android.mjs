import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const result = spawnSync(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  ["assembleDebug"],
  {
    cwd: fileURLToPath(new URL("../android/", import.meta.url)),
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error("Could not start the Android build:", result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const downloadDirectory = fileURLToPath(new URL("../public/downloads/", import.meta.url));
mkdirSync(downloadDirectory, { recursive: true });
copyFileSync(
  fileURLToPath(new URL("../android/app/build/outputs/apk/debug/app-debug.apk", import.meta.url)),
  fileURLToPath(new URL("../public/downloads/chordph.apk", import.meta.url)),
);
console.log("Android APK copied to public/downloads/chordph.apk.");
