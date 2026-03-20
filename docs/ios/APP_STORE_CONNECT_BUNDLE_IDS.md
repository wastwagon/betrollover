# App Store Connect — BetRollover bundle IDs

These are the identifiers that appear in **Apple Developer** / **App Store Connect** (e.g. when creating a **New App** or choosing a **Bundle ID**).

| Name (typical) | Bundle ID | Used for |
|----------------|-----------|----------|
| **BetRollover** (main iOS app) | `com.betrollover.app` | Store listing, Universal Links / Associated Domains, `APPLE_BUNDLE_ID` on the web host, Android package parity. |
| **OneSignal Notification Service Extension** | `com.betrollover.app.OneSignalNotificationServiceExtension` | Rich push / notification extension only — **do not** add this to `apple-app-site-association`; it is not the app that opens URLs. |
| **BetRollover Web** | `com.betrollover.service` | Often a **secondary** identifier (e.g. web/service, Sign in with Apple Services ID, or another Apple capability). **Not** the primary app bundle in this repo’s Xcode WebView target. |

## Repo alignment

- **Xcode** (`webviewgold-iOS/WebViewGold.xcodeproj`): main target **`com.betrollover.app`**, extension **`com.betrollover.app.OneSignalNotificationServiceExtension`** — matches the table above.
- **Next.js deep links** (`APPLE_BUNDLE_ID`, AASA): use **`com.betrollover.app`** only (see [`../COOLIFY_WEBVIEWGOLD_LAUNCH.md`](../COOLIFY_WEBVIEWGOLD_LAUNCH.md) and `web/lib/well-known-mobile.ts`).

## Creating the App Store record

In **App Store Connect → New App**:

1. Enable **iOS** (and any other platforms you actually ship).
2. **Bundle ID**: choose **`BetRollover - com.betrollover.app`** (the main app).
3. **Name** / **Primary language**: as in your storefront plan (e.g. English U.S.).

The extension and `com.betrollover.service` are separate registrations; they do not replace the main app’s bundle ID for the store listing.
