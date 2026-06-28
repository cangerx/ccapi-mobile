# iOS Manual Signing

This project uses Expo prebuild to generate the native iOS project.

## Generated Project

The iOS project has been generated locally:

```txt
ios/CCAPIAdmin.xcodeproj
```

The native folder is ignored by Git on purpose. Regenerate it when needed:

```bash
npm ci
npx expo prebuild --platform ios --clean --no-install
```

## Requirements

Install on the build machine:

- Xcode
- CocoaPods

Then select Xcode as the active developer directory:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Install pods:

```bash
cd ios
pod install
```

After CocoaPods installation, open:

```txt
ios/CCAPIAdmin.xcworkspace
```

If you skip CocoaPods, open `ios/CCAPIAdmin.xcodeproj`, but the workspace is recommended after pods are installed.

## Manual Signing

In Xcode:

1. Select target `CCAPIAdmin`.
2. Open `Signing & Capabilities`.
3. Select your Apple Team.
4. Keep Bundle Identifier as `com.canger.ccapiios`, or change it to your own identifier.
5. Choose a connected device.
6. Build and run.

## Archive / IPA

In Xcode:

1. Select `Any iOS Device`.
2. Product -> Archive.
3. Distribute App.
4. Choose the signing method that matches your certificate/profile.

## Current Local Limitation

This machine currently points `xcodebuild` to Command Line Tools and does not have CocoaPods available, so command-line archive generation cannot be completed here.
