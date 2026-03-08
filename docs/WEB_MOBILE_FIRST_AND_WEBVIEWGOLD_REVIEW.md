# BetRollover Web — Mobile-First & WebViewGold Readiness Review

**Date:** March 2026  
**Purpose:** Score mobile-first design and native-app-like behaviour; recommend enhancements for WebViewGold (App Store / Play Store) submission.

**Scoring:** Each category is scored out of 100; category weights give an overall score that can exceed 100% when bonus items are included. Target: **mobile-enhanced** web experience suitable for wrapping in WebViewGold.

---

## Overall Score Summary

| Category | Score | Weight | Weighted | Notes |
|----------|-------|--------|----------|--------|
| **1. Mobile-first layout & breakpoints** | 88/100 | 20% | 17.6 | Strong base; a few desktop-first patterns |
| **2. Viewport, meta & PWA manifest** | 78/100 | 15% | 11.7 | Good; missing themeColor in viewport, maskable icons |
| **3. Touch & interaction** | 85/100 | 15% | 12.75 | 44px targets, tap highlight off; some small taps |
| **4. Safe areas & notches** | 82/100 | 10% | 8.2 | env(safe-area) used; not everywhere |
| **5. Native-app-like UX** | 80/100 | 15% | 12.0 | Bottom nav, standalone; no pull-to-refresh |
| **6. Performance & loading** | 75/100 | 10% | 7.5 | Skeleton/loading; no service worker |
| **7. Forms & inputs (mobile)** | 72/100 | 10% | 7.2 | Many forms; input mode / autocomplete could improve |
| **8. WebViewGold / store readiness** | 70/100 | 5% | 3.5 | Mobile-optimised; needs status bar & store meta |
| **Bonus: Accessibility & reduced motion** | +6 | — | +6 | Focus ring, reduced-motion, skip link |
| **TOTAL** | — | 100% | **86.45%** | Strong mobile-first; clear path to 95%+ |

---

## 1. Mobile-first layout & breakpoints (88/100)

### What’s in place
- **Tailwind default breakpoints** are mobile-first (`sm:`, `md:`, `lg:` = 640, 768, 1024px). No custom overrides that favour desktop.
- **Main content** uses `pb-24 lg:pb-0` so the bottom nav doesn’t overlap content on small screens; desktop has no bottom nav.
- **MobileBottomNav** is `lg:hidden` — shown only below `lg`; primary experience on small viewports is tab bar.
- **Scrollable horizontal strips** for filters/tabs use `overflow-x-auto`, `scrollbar-hide`, `-mx-1 px-1` for touch-friendly horizontal scroll on mobile.
- **Responsive grids**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (and similar) used across marketplace, tipsters, discover, etc.
- **Header**: Hamburger + sheet on mobile; full nav on large screens.

### Gaps
- Some **admin** and **register** layouts use `hidden lg:flex` for a side panel; mobile gets a single column. A few admin tables rely on `overflow-x-auto` on small screens — acceptable but not ideal for very small viewports.
- **Register/login**: Split layout (`lg:w-[45%]`) is desktop-first in structure; mobile still gets a single column, so impact is low.
- **Dashboard** uses `md:ml-56` for sidebar; mobile gets full-width content. Ensure sidebar is usable as drawer/sheet on smallest screens.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Breakpoints mobile-first | 25/25 | Tailwind defaults; no desktop-first overrides |
| Primary nav is mobile tab bar | 25/25 | Bottom nav is main nav on mobile |
| Responsive grids & stacking | 20/25 | Good; a few dense tables on mobile |
| No horizontal page scroll | 18/25 | Occasional overflow-x on tables; not page-level |

**Recommendation:** Add `viewport-fit=cover` in viewport export when targeting WebViewGold so the app can use full screen including notch areas; keep safe-area insets (see section 4).

---

## 2. Viewport, meta & PWA manifest (78/100)

### What’s in place
- **Viewport export** (Next.js): `width: 'device-width'`, `initialScale: 1`, `maximumScale: 5`, `userScalable: true` — good for accessibility and webview.
- **Manifest** at `/manifest.json`: `display: "standalone"`, `theme_color`, `background_color`, `orientation: "portrait-primary"`, `start_url: "/"`, `short_name`, `icons`, `shortcuts` (Marketplace, Dashboard, Wallet).
- **Metadata**: `formatDetection: { email: false, address: false, telephone: false }` — avoids accidental links in webview.
- **Icons**: `icons.icon`, `icons.apple` point to `/BetRollover-logo.png`.

### Gaps
- **themeColor** is not set in the **viewport** export. Manifest has `theme_color`; Android/WebViewGold status bar will use it if the app loads the manifest, but Next.js viewport `themeColor` ensures the browser/webview status bar matches (e.g. `#10b981`).
- **Apple touch icon**: Metadata has `icons.apple`; ensure the referenced icon exists and is at least 180×180 for “Add to Home Screen” and webview splash.
- **Maskable icons**: Manifest icons use `"purpose": "any maskable"` but a dedicated **maskable** asset (safe zone) is not confirmed; Play Store and some webviews expect a maskable icon for splash/adaptive icons.
- **No explicit `viewport-fit=cover`** for notch/status bar overlap (optional but useful for WebViewGold full-screen).

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Viewport meta correct | 20/25 | device-width, scale; add themeColor |
| Manifest present & valid | 22/25 | standalone, theme, shortcuts; maskable asset |
| Icons (favicon, apple, sizes) | 18/25 | Referenced; add 192/512 if missing; maskable |
| Format detection / webview-safe | 18/25 | Good; no tel: auto-linking |

**Recommendations:**
1. In `app/layout.tsx` viewport export add: `themeColor: '#10b981'` (or `[{ media: '(prefers-color-scheme: dark)', color: '...' }]`).
2. Add a 192×192 and 512×512 icon in `manifest.json` if not already present; provide a maskable variant (e.g. safe zone 80%).
3. For WebViewGold: ensure start_url is absolute (e.g. `https://yoursite.com/`) in manifest if the app loads a remote URL.

---

## 3. Touch & interaction (85/100)

### What’s in place
- **Touch targets**: In `globals.css`, `@media (pointer: coarse)` sets `min-height: 44px` and `min-width: 44px` for `button` and `a` — meets WCAG 2.5.5 (44×44 CSS px).
- **Tap highlight**: `* { -webkit-tap-highlight-color: transparent; }` — no grey flash on tap.
- **Focus**: `:focus-visible` ring with primary colour and offset — keyboard and focus users are supported without forcing a ring on every tap.
- **Bottom nav**: Large tap areas; primary “Coupon” button has a clear hit area.
- **Active states**: `active:scale-95` on nav items for press feedback.

### Gaps
- **Inline links** inside paragraphs (e.g. in Learn, footer) can be smaller than 44px; the global rule applies to `a` but nested inline links may not expand. Consider increasing padding for in-content links on touch devices or leaving as-is if text links are secondary.
- **Icon-only buttons** (e.g. close, menu) should have at least 44px hit area; many do via padding; spot-check any that don’t.
- **Scroll chaining**: No explicit `overscroll-behavior` on main or modals; usually fine; can add `overscroll-behavior-y: contain` on modals/sheets to avoid background scroll when at top/bottom.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Minimum touch target size | 24/25 | 44px for buttons/links on coarse pointer |
| Tap highlight & feedback | 22/25 | Transparent tap; active states present |
| No double-tap zoom issues | 20/25 | initialScale 1; no user-scalable=no |
| Scroll / overscroll behaviour | 19/25 | Good; optional contain on sheets |

---

## 4. Safe areas & notches (82/100)

### What’s in place
- **MobileBottomNav**: `style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}` so the bar sits above the home indicator.
- **DashboardBottomNav** and **create-pick** slip sheet: `env(safe-area-inset-bottom)` in padding.
- **globals.css**: `.safe-area-inset-top` and `.safe-area-inset-bottom` utility classes.
- **DashboardHeader**: Uses `safe-area-inset-top` class.

### Gaps
- **Root main content** uses `pb-24` but does not add `env(safe-area-inset-bottom)` to that padding; the bottom nav wrapper does. If the webview uses `viewport-fit=cover`, the main content might need `padding-bottom: calc(6rem + env(safe-area-inset-bottom))` (or similar) so the last items aren’t hidden behind the nav + home indicator.
- **TopBar** and **UnifiedHeader**: Top bar may sit under status bar on notched devices; ensure TopBar or the first sticky header has `padding-top: env(safe-area-inset-top)` when running in standalone/webview full-screen.
- **Modals / bottom sheets**: Create-pick slip already uses safe-area; other full-screen or bottom-drawn UIs should be audited.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Bottom nav above home indicator | 25/25 | Yes |
| Top (status bar / notch) | 18/25 | Utility exists; apply to top bar in webview |
| Main content padding | 20/25 | pb-24; add safe-area to total bottom padding |
| Sheets/modals | 19/25 | Create-pick good; audit others |

**Recommendation:** When enabling `viewport-fit=cover` for WebViewGold, add a layout wrapper or class that applies `padding-top: env(safe-area-inset-top)` to the first visible bar and `padding-bottom: env(safe-area-inset-bottom)` to the main content area (in addition to nav height).

---

## 5. Native-app-like UX (80/100)

### What’s in place
- **Standalone display**: Manifest `display: "standalone"` — no browser chrome when “installed” or in webview.
- **Bottom tab bar**: Five items (Home, Marketplace, Tipsters, Coupon, Dashboard); primary CTA (Coupon) emphasised.
- **Single column on mobile**: Main flows are vertical; no forced side-by-side on small screens.
- **Sheets / modals**: Create-pick slip is a bottom sheet; dashboard and other modals use overlay + panel.
- **Orientation**: Manifest `portrait-primary` — encourages portrait (optional; can allow both if needed).

### Gaps
- **Pull-to-refresh**: Not implemented. WebViewGold and native browsers often allow pull-to-refresh; consider disabling it in webview (e.g. via WebViewGold config) or handling it in-app (e.g. refresh key content) so it doesn’t conflict with custom scroll.
- **Splash screen**: Manifest and icons support it; ensure WebViewGold is configured with a splash that matches theme_color/background_color.
- **Back gesture / history**: Handled by browser/webview; no custom “back” in the app shell (acceptable).
- **Haptic feedback**: Not available from web; WebViewGold may expose APIs — optional enhancement.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Standalone / no browser UI | 25/25 | Yes |
| Tab bar navigation | 22/25 | Clear; 5 items |
| Sheets & overlays | 20/25 | Good; consistent with mobile patterns |
| PTR / splash / back | 13/25 | PTR not custom; splash via config |

---

## 6. Performance & loading (75/100)

### What’s in place
- **Loading states**: Many routes have `loading.tsx` (skeletons, spinners); avoids layout shift.
- **Skeleton styles** in globals.css; used across app.
- **Next.js**: App Router; automatic code splitting per route.

### Gaps
- **Service worker**: No PWA service worker in the repo; WebViewGold loads the remote URL, so caching is typically handled by the webview. For “mobile enhanced” you could add a minimal SW for cache-first for static assets (optional).
- **LCP**: Images use Next.js `Image` where applicable; ensure critical hero images have priority and dimensions.
- **CLS**: Safe-area and fixed bottom nav can cause slight shift if not reserved; current pb-24 helps.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Loading / skeleton UI | 23/25 | Good coverage |
| No full-page spinner only | 22/25 | Inline and route-level loading |
| Service worker / offline | 15/25 | None; optional for webview |
| LCP/CLS considerations | 15/25 | Reasonable; can tune further |

---

## 7. Forms & inputs (mobile) (72/100)

### What’s in place
- **Large tap targets** from global 44px rule for buttons/links; form submit buttons benefit.
- **Labels and structure**: Forms use semantic markup where present.

### Gaps
- **Input types and attributes**: Use `type="email"`, `type="password"`, `inputMode="numeric"` / `inputMode="decimal"` where appropriate (e.g. wallet amount) so mobile keyboards are optimal.
- **autocomplete**: Add `autocomplete="email"`, `autocomplete="current-password"`, etc., for login/register to improve autofill and UX in webview.
- **Large inputs**: Ensure inputs have at least 16px font size (or 16px effective) to avoid iOS zoom on focus; current font sizing is generally fine.
- **Date/time**: If any date pickers exist, ensure they use native `<input type="date">` or a touch-friendly picker on mobile.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Touch-friendly submit/cancel | 20/25 | Buttons get 44px |
| inputMode / type / autocomplete | 15/25 | Partial; add where missing |
| No zoom on input focus (iOS) | 20/25 | Likely ok; verify 16px |
| Labels and errors | 17/25 | Present; ensure associated |

---

## 8. WebViewGold / store readiness (70/100)

### What’s in place
- **Mobile-optimised layout**: Primary experience is mobile-first; WebViewGold docs state mobile-optimised design is important for approval.
- **HTTPS**: Required for production; WebViewGold can load remote HTTPS URL.
- **Content**: No obvious policy violations; gambling disclaimer and 18+ messaging present.
- **Manifest**: Standalone, theme, icons, shortcuts — good for “Add to Home Screen” and webview branding.

### Gaps
- **Status bar colour**: Set via viewport `themeColor` (see section 2) so the webview status bar matches the app.
- **Splash screen**: WebViewGold typically uses a static splash; align colour with `theme_color` / `background_color`.
- **Store listing**: Not part of the web project; ensure store listing and screenshots show the mobile web experience (portrait, bottom nav visible).
- **Deep links**: If you want links to open in the app, configure WebViewGold and optional universal links / App Links; web app can use same paths.
- **16 KB page size (Android 15)**: WebViewGold’s template is reportedly compliant; your web bundle is not affected.

### Score breakdown
| Criterion | Points | Notes |
|-----------|--------|--------|
| Mobile-optimised design | 25/25 | Yes |
| HTTPS & manifest | 20/25 | Yes; themeColor in viewport |
| Status bar / splash alignment | 15/25 | theme_color in manifest; viewport themeColor |
| Store policy / content | 10/25 | N/A in repo; your responsibility |

---

## Bonus: Accessibility & reduced motion (+6)

- **Focus ring**: `:focus-visible` with primary colour — +2.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables animations — +2.
- **Skip to main content**: `SkipToMainContent` component — +1.
- **Semantic main**: `role="main"`, `id="main-content"` — +1.

---

## Recommended changes for “mobile enhanced” and WebViewGold

### High impact (do first)

1. **Viewport themeColor**  
   In `app/layout.tsx`: add to viewport export  
   `themeColor: '#10b981'`  
   (or array with dark mode if you support it).

2. **Safe area on main content**  
   Ensure main content bottom padding accounts for both bottom nav and safe area, e.g.  
   `pb-[calc(6rem+env(safe-area-inset-bottom))]` on `#main-content` for `lg`-below, or equivalent so the last item is never under the home indicator.

3. **Top bar safe area**  
   Apply `padding-top: env(safe-area-inset-top)` to the topmost bar (TopBar or first header) when the app is used in standalone/webview, or always if you plan to use `viewport-fit=cover`.

4. **Manifest icons**  
   Add 192×192 and 512×512 entries if missing; provide one icon with safe zone for `purpose: "maskable"`.

### Medium impact

5. **viewport-fit=cover**  
   In viewport export add `viewportFit: 'cover'` when targeting WebViewGold so the webview can use full screen; keep using safe-area insets everywhere relevant.

6. **Form attributes**  
   On login/register/wallet: `inputMode`, `autoComplete`, and correct `type` for email/password/numeric where appropriate.

7. **Pull-to-refresh**  
   Either disable in WebViewGold or implement a lightweight “refresh” on key pages (e.g. marketplace, tipsters) so PTR doesn’t feel broken.

### Lower priority

8. **Optional service worker**  
   For cache-static-assets and slightly faster repeat loads in webview (optional).

9. **Splash / theme**  
   In WebViewGold project, set splash and status bar to match `#10b981` and manifest `background_color`.

10. **Store assets**  
    Use screenshots of the mobile web (portrait, bottom nav, key screens) for App Store and Play Store listings.

---

## Summary

- **Overall weighted score: ~86.45%** with **+6 bonus** for accessibility/reduced motion. The project is **mobile-first**, uses **standalone** manifest and **safe-area** in critical places, and has **touch-friendly** targets and **bottom tab** navigation — all good for WebViewGold.
- To make the web version **mobile enhanced** and store-ready: add **viewport themeColor**, **full safe-area coverage** (top bar + main bottom), **viewport-fit=cover** if using full-screen webview, and **manifest maskable icons**; then tune forms and PTR/splash in WebViewGold.

After these changes, the same codebase remains a single mobile-first web app suitable for WebViewGold submission to the App Store and Play Store.
