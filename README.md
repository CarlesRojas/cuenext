# CueNext

## Getting Started

To run this application:

```bash
pnpm i
```

```bash
pnpm dev
```

## Building For Production

To build this application for production:

```bash
pnpm build
```

```bash
pnpm serve
```

## Database

```bash
pnpx convex dev
```

## Build Android App

Key name: cuenext_key_store
First and Last names (eg: John Doe): Carles Rojas
Organizational Unit (eg: Engineering Dept): Pinya
Organization (eg: Company Name): Pinya
Country (2 letter code): ES

https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/

```bash
bubblewrap init --manifest=https://www.cuenext.app/manifest.json
```

```bash
bubblewrap build
```

```bash
adb install app-release-signed.apk
```

# TODO

- [ ] Section Carousel does not adapt when the screen resizes
- [ ] In upcoming, instead of separating in these week days, do the next 7 days
- [ ] The height of the sidebar animates when returning to the tab
