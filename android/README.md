# CueNext for Android

A Bubblewrap TWA wrapping `https://www.cuenext.app`, plus one piece of native code: the home-screen
watchlist widget in `widget/` (see below). Deploying the site is what updates the app itself; you
only need a release when something in this folder changes, or when Play asks for one.

The app is on Play as `app.cuenext.pinya`, signed with the upload key at `android/android.keystore`
(alias `cuenext_key_store`). Play rejects a bundle signed with any other key, so that keystore is the
one thing in here that cannot be regenerated. It is gitignored, keep it somewhere safe.

## Release a new version

### 1. Install the CLI

```sh
npm install -g @bubblewrap/cli@latest
```

Install it fresh every time rather than reusing an old global copy. The SDK levels, the Android
Gradle Plugin and the `androidbrowserhelper` version all come from the CLI's own templates, so an
outdated CLI quietly downgrades `targetSdkVersion` and Play refuses the upload.

The first command you run will offer to download a JDK and the Android SDK into `~/.bubblewrap`.
Accept, or point it at copies you already have. `bubblewrap doctor` confirms both paths afterwards.

### 2. Deploy the site first

`bubblewrap update` reads the Web Manifest and some of the icons over the network, from
`https://www.cuenext.app`, not from `public/`. If this release is meant to pick up a changed
manifest, icon or shortcut, that change has to be live before you run it.

If the logo itself changed, see the next section before releasing.

### 3. Build

```sh
cd android
bubblewrap update
./apply-assets.sh
bubblewrap build
```

`bubblewrap update` bumps `appVersionCode` by one and sets `appVersionName` to match, saves both
back into `twa-manifest.json`, then regenerates `app/` from the templates and the live manifest. You
do not need to edit the version by hand. It deletes `app/` wholesale on the way, which is why the
masters live in `splash/` and `icon/` and get copied back by `apply-assets.sh`.

`bubblewrap build` asks for the keystore password and the key password. To skip the prompts, set
`BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD` in the environment.

It leaves two build outputs in this folder, both gitignored:

- `app-release-bundle.aab`, the file Play wants.
- `app-release-signed.apk`, for installing on a device directly.

### 4. Check it on a device

```sh
bubblewrap install
```

Launch it. If the app opens with a Chrome address bar across the top, Digital Asset Links did not
verify and the TWA is falling back to a Custom Tab. See below.

### 5. Upload to Play

Play Console, then Test and release. Internal testing takes the same bundle if you want a look
before production. Create a new release, upload `app-release-bundle.aab`, roll out.

### 6. Commit what changed

The version bump in `twa-manifest.json`, the regenerated `manifest-checksum.txt`, and any resources
that changed because the site's icons changed. The `.aab` and `.apk` are gitignored, leave them.

## When the logo changes

The legacy launcher icon, the Play store icon and the shortcut icons are downloaded by
`bubblewrap update` from the URLs in `twa-manifest.json`, so those come from the deployed site rather
than from your working copy. The splash screens and the adaptive icon layers are rendered here
instead, for the reasons below. So after replacing the logo in `public/`:

```sh
pnpm android:assets
```

That writes the splash masters in `android/splash/` and the adaptive icon layers in `android/icon/`.
Both are copied into the project by `apply-assets.sh`, which is already part of the release steps, so
neither has to be deployed first. Deploy for the sake of the icons Bubblewrap does download.

### Why the splash is overridden

Bubblewrap builds `splash.png` by resizing the whole icon to fill the canvas, which leaves the mark
at 47.25% of a 300dp square and reads as oversized on launch. The masters here put it at 30.67%.

### Why the adaptive icon is overridden

An adaptive icon is a 108dp layer of which launchers only ever show the central 72dp, and Bubblewrap
draws the icon into 91dp of that layer, so about a fifth of the file is cropped away. What is left
therefore depends entirely on how much padding the icon it downloaded was drawn with, and it
downloads `maskableIconUrl` from the live site at update time. Rendering the layers here pins that to
`public/maskableIcon512.png` instead, so a change to the deployed icon cannot quietly reshape the
launcher icon in a release that was not about icons at all.

The layers are also shrunk to 72/91, the `ICON_SCALE` in `script/renderAndroidAssets.mjs`, so that
what survives the crop is exactly the icon as drawn, on its own border colour. `maskableIcon512.png`
carries the safe-zone padding a maskable icon is meant to have, 26.6% a side, and that puts the mark
at 46.9% of the visible 72dp instead of the 59.2% the crop would otherwise magnify it to. Raise the
constant towards 1 to give the mark more of the circle; the script prints where it lands for
whatever value it is set to.

The layers are also drawn at one pixel per pixel of the 91dp they are displayed in, where
Bubblewrap's own are smaller than that and get magnified at draw time.

### If the artwork changes shape

The splash mark is sized and centred by the pixels it draws rather than by the canvas it was exported
on, so it need not be centred in its file, but it does need a transparent background, since the
script composites it over `backgroundColor` itself. `logo512.png` and `logo256.png` are the same
image and either would do; `maskableIcon512.png` would not, as its background is baked in.

The icon layers take the opposite input, the opaque icon with its background, and read the padding
colour from the top-left pixel. Both figures the script prints are worth a glance after a redraw: the
splash mark at 30.67% of the canvas, and the launcher mark near 47% of the visible 72dp.

## The home-screen widget

`widget/` holds the one native feature of the app: an AppWidget that renders the watchlist's
horizontal lists (configurable per widget, with the Shows/Movies toggle in its corner) and can mark
titles watched in place. `bubblewrap update` deletes `app/` wholesale and its templates know nothing
about the widget, so nothing widget-related lives in `app/` as a source of truth:

- `widget/src/` are the Java sources, copied into `app/src/main/java/` by `apply-widget.sh`.
- `widget/res/` are its layouts, drawables and strings, merged into `app/src/main/res/`. Every file
  is widget-prefixed so it can never collide with what Bubblewrap generates.
- `widget/manifest/` are the two snippets `apply-widget.sh` splices into the regenerated
  `AndroidManifest.xml`: the `INTERNET` permission (the TWA itself never needed it, Chrome does its
  networking) and the widget's receiver plus its two activities.

`apply-assets.sh` runs `apply-widget.sh`, so the release steps above are unchanged. The script is
idempotent and fails loudly if the manifest patch does not land, which is the thing to check first
if a new Bubblewrap CLI ever reshapes the manifest.

The widget is deliberately plain-framework Java (HttpURLConnection, org.json, RemoteViews) so
`build.gradle` never needs patching. If you ever add a dependency to it, `apply-widget.sh` has to
learn to patch `build.gradle` too.

How it gets data: the widget can't reuse the web session (that lives inside Chrome), so the profile
page mints a long-lived token in Convex (`convex/widget.ts`) and hands it over through the
`cuenext://widget-setup` deep link, which `WidgetTokenActivity` catches and stores. The widget then
calls the Convex HTTP endpoints in `convex/http.ts`. Revoking from the profile page 401s the token
and the widget shows its reconnect message.

## Digital Asset Links

The TWA only opens without a browser address bar while `public/.well-known/assetlinks.json` lists the
certificate of the key that signed the copy being run. Two keys sign this app, so both belong there:

- Play App Signing re-signs every release, and that certificate is the one users install. Its
  fingerprint comes from Play Console, under Test and release, Setup, App signing.
- The upload key above signs `bubblewrap build` output, so local installs verify too.

`bubblewrap fingerprint list` shows what the project knows about, and
`bubblewrap fingerprint generateAssetLinks` writes the file from it. If a fingerprint stops matching,
the app still runs, it just shows the address bar.

## What is generated and what is not

Everything here except this README, `apply-assets.sh`, `apply-widget.sh`, `widget/`, `splash/`,
`icon/` and `.gitignore` is generated output. Edit `twa-manifest.json` and re-run the release steps
rather than editing `app/` directly, since `bubblewrap update` overwrites all of it. The widget
files inside `app/` are copies too: edit them in `widget/` and re-run `apply-widget.sh`.

## Target API level

Play requires apps to target Android 16 (API 36) from 31 August 2026, and this project already
compiles and targets 36. A warning in Play Console about API 35 or lower is about the build that is
live on the store, not about this folder: the fix for it is to cut a release with the steps above and
publish it to production.
