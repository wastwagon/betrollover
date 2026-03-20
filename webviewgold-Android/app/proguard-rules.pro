# BetRollover / WebViewGold — release shrinker rules (safe defaults; extend as needed)

-ignorewarnings

# WebView & JavaScript bridge (reflection)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep class * extends android.webkit.WebChromeClient { *; }
-keep class * extends android.webkit.WebViewClient { *; }

# Google Play Billing / RevenueCat (JSON, models)
-keep class com.android.billingclient.** { *; }
-keep class com.revenuecat.purchases.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keepclassmembers class * {
  @com.google.gson.annotations.SerializedName <fields>;
}
-keep class * implements java.io.Serializable { *; }

# Gson / JSON (template & IAP)
-dontwarn com.google.gson.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# OneSignal (keep public SDK surface; adjust package if SDK updates)
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# Firebase / FCM (messaging)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Pushwoosh
-keep class com.pushwoosh.** { *; }
-dontwarn com.pushwoosh.**

# Meta Audience Network (ads)
-keep class com.facebook.ads.** { *; }
-dontwarn com.facebook.infer.annotation.**

# Glide (images)
-keep public class * implements com.bumptech.glide.module.GlideModule { *; }
-keep class * extends com.bumptech.glide.module.AppGlideModule { *; }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
    **[] $VALUES;
    public *;
}
-keep class com.bumptech.glide.** { *; }

# User Messaging Platform (UMP consent)
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.ump.**

# WorkManager (background tasks)
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker
-keep class androidx.work.** { *; }

# OkHttp / Kotlin (common transitive deps)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# App model / WebViewGold Java entrypoints
-keep class com.betrollover.app.** { *; }
