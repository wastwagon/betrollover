# OneSignal Android push — Firebase (FCM) setup guide

This matches your **BetRollover** app: package name **`com.betrollover.app`** and OneSignal App ID **`7a03eef6-013d-4ffd-b059-a6a33872d003`** (already in `app/build.gradle`).

---

## Part A — Firebase (first screenshot: “Create a project”)

### Step 1 — Create a Firebase project

1. Go to **[Firebase Console](https://console.firebase.google.com)**.
2. Click **Add project** (or **Create a project**).
3. On **“Create a project”** / **“Let’s start with a name for your project”**:
   - Enter a name, e.g. **`BetRollover`**.
   - Check **I accept the Firebase terms**.
   - Click **Continue**.
4. **Google Analytics** — you can turn it **off** if you only need push; or leave **on** if you want it. Click **Continue** / **Create project** until the project is ready.
5. Click **Continue** to open the new project.

### Step 2 — Add your Android app

1. On the project **overview**, click the **Android** icon (or **Add app** → **Android**).
2. **Android package name:** enter exactly:
   ```text
   com.betrollover.app
   ```
   (Must match `applicationId` in `app/build.gradle`.)
3. **App nickname** (optional): e.g. `BetRollover Android`.
4. **Debug signing certificate SHA-1** (optional for FCM basics; add later if you use Google Sign-In / Dynamic Links).
5. Click **Register app**.

### Step 3 — Download `google-services.json`

1. Click **Download google-services.json**.
2. On your Mac, replace the file in this repo:
   - **Path:** `webviewgold-Android/app/google-services.json`
   - Overwrite the existing file (remove any placeholder with `xxxxxxxxxxx` values).
3. In Firebase, click **Next** through the Gradle steps (your project **already** applies `com.google.gms.google-services` in `app/build.gradle`) → **Continue to console**.

### Step 4 — Enable Cloud Messaging (for OneSignal)

1. In Firebase, click the **gear** → **Project settings**.
2. Open the **Cloud Messaging** tab.
3. Note what you see:
   - **Sender ID** (numeric) — OneSignal may ask for this.
   - If OneSignal asks for a **Server key** (legacy): it sometimes appears here or under **Cloud Messaging API (Legacy)** in Google Cloud Console. **New projects** often use **FCM HTTP v1** instead — then OneSignal will ask for a **Service account** / JSON key (see Part B).

---

## Part B — OneSignal (screenshot: Settings → Platforms)

### Step 5 — Activate Google Android (FCM)

1. Open **[OneSignal Dashboard](https://dashboard.onesignal.com)** → select **BetRollover**.
2. Go to **Settings** → **Platforms** (or **Push & In‑App** → platform list).
3. Under **Inactive platforms**, find **Google Android (FCM)** → click **Activate** / **Configure**.

### Step 6 — Paste what OneSignal asks for

OneSignal’s wizard changes over time. Do **exactly** what their screen says. Typical cases:

| OneSignal asks for | Where to get it |
|--------------------|-----------------|
| **Firebase Server Key** + **Sender ID** | Firebase **Project settings** → **Cloud Messaging** (and/or Google Cloud → APIs; legacy key if still shown). |
| **FCM v1 / Service account JSON** | Google Cloud Console → your Firebase project → **IAM & Admin** → **Service accounts** → create JSON key; or follow OneSignal’s “Upload JSON” / “Generate key” link. |

4. **Save** / **Finish** until Android shows as **Active** (like iOS does on your Platforms screen).

---

## Part C — Your Android project (already mostly done)

Verify in code:

| Item | Location |
|------|----------|
| OneSignal App ID | `app/build.gradle` → `ONESIGNAL_APP_ID` |
| Package / namespace | `com.betrollover.app` |
| OneSignal enabled | `Config.java` → `PUSH_ENABLED = true` |
| Google Services | `app/google-services.json` (**real file from Firebase**) |

---

## Part D — Build and test

1. Open **`webviewgold-Android`** in **Android Studio**.
2. **File → Sync Project with Gradle Files**.
3. Run on a **real phone** with **Google Play services** (push is unreliable on emulators without Play).
4. Accept **notification permission** when the app asks.
5. In OneSignal: **Audience** / **Subscriptions** (or their **test subscriber** step) and send a **test push** to your device.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Android still “Inactive” in OneSignal | Finish **Activate Android** and save; FCM key/JSON must match this Firebase project. |
| Build errors about `google-services.json` | File must live in **`app/`** folder, package name **`com.betrollover.app`**. |
| No subscriber on device | Real device, Play services, notification permission granted, correct OneSignal App ID. |
| iOS works, Android doesn’t | Almost always **FCM not configured** in OneSignal or wrong **`google-services.json`**. |

---

## Screenshot cheat sheet

1. **Firebase — Create a project:** project name + accept terms → Continue (your first screenshot).
2. **Firebase — Add Android app:** package `com.betrollover.app` → download `google-services.json`.
3. **OneSignal — Settings → Platforms:** **Google Android (FCM)** → **Activate** (your second-style screenshot with inactive Android).

When those three are done, Android push can work the same app ID as iOS: **`7a03eef6-013d-4ffd-b059-a6a33872d003`**.
