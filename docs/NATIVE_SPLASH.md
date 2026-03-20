# Native splash (WebViewGold) — BetRollover

The splash **image** is synced from the iOS **App Icon** master: `AppIcon.appiconset/1024.png` → `drawable/splash.png` + `SplashBrand.imageset`. Re-copy after you change the store icon.

**Background:** White (`splash_screen_background` / `Constants.splashscreencolor`). Android uses `blackStatusBarText = true` for readable status icons on white.

**Size:** `Config.SCALE_SPLASH_IMAGE` (Android) and `scaleSplashImage` (iOS) default to **60** (% of smallest screen dimension). Increase toward **70–85** if you want it larger; **100** = full-bleed.

**“White box” around the logo:** If `1024.png` includes a solid white square behind the shield, export a version with a **transparent** background (PNG) for a cleaner look on white.

**Splash feels slow:** Dismiss happens as soon as navigation **starts** (Android `onPageStarted` when `SPLASH_DISMISS_AT_PROGRESS > 0`; iOS `didStart` / `didCommit` + low `splashDismissAtEstimatedProgress`). StoreKit product fetch is **deferred ~2s** on iOS so `DownloadFailed` / network stalls don’t extend the first paint. Fix slow **WEBP** / heavy JS on the site for faster WebKit startup.

## Android

- **Drawable:** `webviewgold-Android/app/src/main/res/drawable/splash.png`  
  Replace or regenerate from `AppIcon.appiconset/1024.png`. Centered at `Config.SCALE_SPLASH_IMAGE` (default **60**). `GifImageView` accepts a static PNG.
- **Background:** `splash_screen_background` in `app/src/main/res/values/colors.xml` (default **#0F172A**).
- **Layout:** `res/layout/splash_screen.xml`

## iOS

- **Asset catalog:** `webviewgold-iOS/WebView/Assets.xcassets/SplashBrand.imageset/SplashBrand.png`  
  Replace **SplashBrand.png** (keep the name or update `Contents.json` + code references).
- **Launch screen:** `WebView/Base.lproj/LaunchScreen.storyboard` uses image **SplashBrand**.
- **Code:** `SplashscreenVC.swift` and `WebViewController.swift` load **`UIImage(named: "SplashBrand")`** first, then fall back to **`splash` GIF** only if that asset is missing.
- **Background:** `Constants.splashscreencolor` in `Config.swift` (default **#0f172a**).

## Custom artwork

The shipped splash is an AI-generated static image aligned with the web PWA (`#0f172a` / emerald accent). For production you may want a designer-exported **@2x / @3x** set in `SplashBrand.imageset` and **mdpi–xxxhdpi** drawables on Android.
