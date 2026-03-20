# Android launcher name & icon (BetRollover)

## App name (“WebViewGold” still on your phone?)

The **display name** comes from:

- `app/src/main/res/values/strings.xml` → `app_name` (**must be `BetRollover`**)
- `AndroidManifest.xml` → `android:label="@string/app_name"`

If the drawer still shows **WebViewGold**, you are almost certainly running an **old APK**:

1. **Uninstall** the app from the device.
2. In Android Studio: **Build → Clean Project**, then **Run** (or install the new APK).
3. Optional: **Settings → Apps → (old app)** → confirm it’s gone, then reinstall.

The launcher caches names per install; updating the project alone does not rename an already-installed package.

## App icon (soccer / “BR” artwork)

On **API 26+**, the launcher uses **adaptive icons**:

- `mipmap-anydpi-v26/ic_launcher.xml` & `ic_launcher_round.xml`
- **Foreground:** `drawable/ic_launcher_foreground_safe.xml` applies **21dp** insets on `ic_launcher_foreground` so the logo sits in the adaptive “safe zone” (increase insets to **24dp**–**28dp** if it still looks zoomed; decrease to **16dp** if too small).
- **Background:** `values/colors.xml` → `ic_launcher_background` (default **white**; use brand **#10b981** if your mark is light-colored)

Legacy **flat** icons (also used on older Android):

- `mipmap-*/ic_launcher.png`
- `mipmap-*/ic_launcher_round.png`

Replace those PNGs with your **BetRollover** artwork at each density (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi), keeping the **same filenames**. Tools: [Android Asset Studio – Launcher icons](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) or Android Studio **File → New → Image Asset**.

**Foreground** should be safe inside the **center 66%** circle (masking). Use a simple mark + transparent padding if needed.

## Quick verify after changes

```bash
./gradlew :app:assembleDebug
```

Then install on device and check the app drawer label + icon.
