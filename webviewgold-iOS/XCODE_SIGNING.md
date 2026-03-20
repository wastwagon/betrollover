# WebViewGold iOS — signing & OneSignal (BetRollover)

## Targets (must match Apple Developer)

| Target | Bundle ID |
|--------|-----------|
| **WebViewGold** (app) | `com.betrollover.app` |
| **OneSignalNotificationServiceExtension** | `com.betrollover.app.OneSignalNotificationServiceExtension` |

Do **not** use `…OneSignalNotificationService` (missing `Extension`).

## After pulling these changes

1. Close Xcode.
2. Delete **Derived Data** for this project (optional but helps): Xcode → Settings → Locations → Derived Data → delete folder for WebViewGold.
3. Open **`WebViewGold.xcworkspace`** (not `.xcodeproj` if you use CocoaPods).
4. Select target **OneSignalNotificationServiceExtension** → **Signing & Capabilities**:
   - Enable **Automatically manage signing**
   - Team: **Gilbert Kwabena Amidu** (`G5KW922XBB`)
   - Confirm bundle ID is exactly `com.betrollover.app.OneSignalNotificationServiceExtension`
5. Select target **WebViewGold** → same team + `com.betrollover.app`.

## Duplicate targets

If you ever duplicated a target in Xcode (names ending in “copy”), **delete the duplicate** and keep only the two targets above.

## APNs `.p8` key

The Auth Key file is **only** uploaded in **OneSignal**. Do not add it to the Xcode project.

## OneSignal App ID

Set in `WebView/Config.swift`:

- `oneSignalID`
- `kPushEnabled = true`
