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

For a development client:

```bash
npm run eas:build:development
npm run start:dev-client
```

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
