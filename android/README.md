# CueNext for Android

A Bubblewrap TWA wrapping `https://www.cuenext.app`. There is no app code here, so
deploying the site is what updates the app. You only need a release when something in
this folder changes.

Before the first release: put the keystore at `android/android.keystore` (alias
`cuenext_key_store`) and make sure the CLI is current, or it will quietly downgrade
`targetSdkVersion`.

```sh
npm install -g @bubblewrap/cli@latest
```

## Release an update

```sh
cd android
bubblewrap update && ./apply-splash.sh && bubblewrap build
```

`update` bumps the version, regenerates the project and rewrites `manifest-checksum.txt`,
so there is nothing to edit by hand. It deletes `app/` wholesale, which is why
`apply-splash.sh` runs after it. It also refetches the web manifest and every icon from
the live site, so you need to be online.

Check `app/build.gradle` shows `targetSdkVersion 36` and the version you expect, then
upload `app-release-bundle.aab` in Play Console under Production, Create new release.

## Splash

`splash/` holds the masters and `apply-splash.sh` copies them into
`app/src/main/res/drawable-*/`. Edit `splash/`, never `res/`, which gets overwritten.

The masters were rendered from `public/logo256.png`, the highest resolution copy of the
mark in the repo. There is no vector source, so the largest density is upscaled slightly.

## Target API

Play requires `targetSdkVersion` within a year of the latest Android release, enforced
every August 31 (36 as of Aug 2026). It comes from Bubblewrap's template rather than
`twa-manifest.json`, so an outdated CLI silently reverts it.

## Building without `update`

Only if you skip `update`, nothing bumps for you: raise `versionCode` and `versionName` in
`app/build.gradle` plus `appVersionCode`, `appVersionName` and `appVersion` in
`twa-manifest.json`, then refresh the checksum, or `bubblewrap build` offers to regenerate
and undoes it.

```sh
shasum -a 1 twa-manifest.json | cut -d' ' -f1 | tr -d '\n' > manifest-checksum.txt
```
