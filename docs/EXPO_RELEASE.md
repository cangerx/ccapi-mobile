# Expo Release

This project is the CCAPI mobile admin console.

## App Identity

- App name: `CCAPI Admin`
- Slug: `ccapi-ios`
- iOS bundle identifier: `com.canger.ccapiios`
- Android package: `com.canger.ccapiios`
- URL scheme: `ccapiios`

The app is not bound to the upstream Expo project. Configure your own Expo account and EAS project before production builds.

## First-Time EAS Setup

```bash
npx expo login
npx eas login
npx eas init
```

After `eas init`, Expo will add the project id to `app.json`.

## Local Development

```bash
npm ci
npm run start
```

For an iOS Simulator development client:

```bash
npm run eas:build:simulator
npm run start:dev-client
```

The `development` profile sets `ios.simulator=true`, so it does not need Apple signing credentials.

For an Android APK:

```bash
npm run eas:build:android-apk
```

The `android-apk` profile sets `android.buildType=apk`, so the artifact can be installed directly on Android devices.

## GitHub Actions Builds

1. Open **Actions -> EAS Build -> Run workflow**.
2. Choose `build_target=ios-simulator` or `build_target=android-apk`.
3. Wait for the run to finish.
4. Open the run summary or Expo build page and download the artifact.

## Preview Build

```bash
npm run eas:build:preview
```

## Production Build

```bash
npm run eas:build:production
```

## OTA Updates

```bash
npm run eas:update:preview -- "your message"
npm run eas:update:production -- "your message"
```

Make sure the installed native shell has the same `runtimeVersion` policy and supports `expo-updates`.

## Notes

- Use Expo Go for quick UI checks only.
- Use a development build for reliable branch/update testing.
- Do not commit Admin Keys or production CCAPI endpoints.
