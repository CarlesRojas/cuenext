# CueNext

## Run locally

```sh
pnpm i
pnpm dev
```

```sh
pnpx convex dev
```

## Checks

```sh
pnpm check
pnpm test
```

## Build for production

```sh
pnpm build
pnpm start
```

## Update the Android app

Only needed when something in `android/` changes or Play asks for a new release. Deploy the site first: Bubblewrap reads the live manifest and icons.

1. Install the CLI fresh (an old copy silently downgrades `targetSdkVersion`):

```sh
npm install -g @bubblewrap/cli@latest
```

2. Build (set `BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD` to skip the prompts). `bubblewrap update` deletes the widget along with the rest of `app/`; `apply-assets.sh` puts it back, so never skip it:

```sh
cd android
bubblewrap update
./apply-assets.sh
bubblewrap build
```

3. Check it on a device (a Chrome address bar on launch means Digital Asset Links failed to verify):

```sh
bubblewrap install
```

4. Upload `android/app-release-bundle.aab` in Play Console → Test and release.

5. Commit the version bump in `twa-manifest.json`, `manifest-checksum.txt` and any changed resources. The `.aab` and `.apk` are gitignored.

### Run the app against local dev

In Android Studio, run the `app staging` configuration instead of `app`. It launches the app on the URL in `android/.run/app staging.run.xml` (the `-d` value in `ACTIVITY_EXTRA_FLAGS`) instead of production. It only affects that launch; packaged releases always use the production URL from `twa-manifest.json`.

With `pnpm dev` running, on a USB device (`http://localhost:3000/`, the default):

```sh
adb reverse tcp:3000 tcp:3000
```

On an emulator, set the URL to `http://10.0.2.2:3000/` — no tunnel needed. The widget works against local dev too: `npx convex dev` runs in Convex's cloud, and pairing from the local profile page points the widget there.

### Notes

- `android/android.keystore` (alias `cuenext_key_store`) is gitignored and cannot be regenerated. Keep it safe. Play rejects bundles signed with any other key.
- `bubblewrap update` deletes `app/` and regenerates it. Never edit `app/` directly: `apply-assets.sh` restores the splash and icon masters (`android/splash/`, `android/icon/`) and the home-screen widget (`android/widget/`, via `apply-widget.sh`).
- If the logo changed, run `pnpm android:assets` first to re-render the splash and icon masters.
- If a fingerprint changes, regenerate `public/.well-known/assetlinks.json`:

```sh
bubblewrap fingerprint generateAssetLinks
```

## Android widget

The home-screen widget is native Java in `android/widget/` (no dependencies, on purpose). It talks to the Convex HTTP endpoints in `convex/http.ts` with a token minted from Profile → Connect widget, handed over via the `cuenext://widget-setup` deep link. Edit it in `android/widget/` and re-run `android/apply-widget.sh`.
