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
cd android && bubblewrap update && ./apply-splash.sh && bubblewrap build
```
