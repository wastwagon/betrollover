# BetRollover – App Store & Play Store Approval Audit

**Purpose:** Assess iOS and Android approval risk and feature compliance before launch.  
**Date:** 2025-02-19

---

## Executive Summary

| Platform | Approval Risk | Main Concerns |
|----------|---------------|---------------|
| **Apple App Store** | **Medium–High** | Licensing, age verification, payment classification, gambling classification |
| **Google Play Store** | **Medium** | Licensing, age verification, geo-restriction, responsible gambling |

**Bottom line:** BetRollover is a tipster marketplace with real-money wallet, deposits (Paystack), and purchases tied to betting outcomes. Both stores treat this as a high-sensitivity category. **You will likely need a gambling/tipster license and several compliance changes before approval.**

---

## 1. How BetRollover Is Likely Classified

| Aspect | Your App | Store View |
|--------|----------|------------|
| **Core function** | Marketplace for betting tips (picks) | Gambling-adjacent / real-money gaming |
| **Money flow** | Users deposit → buy tips → escrow → payout on win/loss | Real-money exchange tied to betting outcomes |
| **Payments** | Paystack (card/mobile money) + optional IAP top-up | External payment for “currency” used in-app |
| **Market** | Ghana (GHS) | Must comply with local law |

**Conclusion:** Stores will treat this as **gambling or real-money gaming**, not as a simple “tips/advice” app. That triggers stricter rules.

---

## 2. Apple App Store (iOS)

### Guideline 5.3 – Gambling, Betting, Lotteries

| Requirement | Your Status | Action |
|-------------|-------------|--------|
| **Valid gambling license** | ❌ Not evident | Obtain license from Gaming Commission of Ghana (or equivalent) for tipster/betting advice services |
| **Geo-restriction** | ❌ Not implemented | Restrict app to Ghana (or other licensed jurisdictions) only |
| **Free distribution** | ✅ App is free | No change |
| **No IAP for gambling currency** | ⚠️ Mixed | You use Paystack for deposits. IAP for “top up” may conflict if Apple treats it as gambling currency. Clarify with Apple or legal counsel |
| **Age verification** | ❌ Not implemented | Add 18+ gate before any real-money features |
| **Legal disclaimers** | ⚠️ Partial | Terms/Privacy exist; add gambling-specific disclaimers |

### Other Apple Concerns

| Issue | Risk | Fix |
|------|------|-----|
| **Paystack for deposits** | Medium | If classified as gambling, external payment may be allowed (Apple forbids IAP for gambling currency). If classified as “digital goods,” Apple may require IAP. Get legal/Apple guidance |
| **Content rating** | High | Add `infoPlist.NSAppTransportSecurity` if needed; set age rating to 17+ or 18+ in App Store Connect |
| **No “Reader” app exception** | N/A | Not applicable; you facilitate payments |

### Common Rejection Reasons (Gambling)

- Missing or invalid gambling license  
- No age verification  
- VPN or location workarounds  
- Unauthorized payment methods  
- Incomplete legal documentation  

---

## 3. Google Play Store (Android)

### Gambling Policy

| Requirement | Your Status | Action |
|-------------|-------------|--------|
| **Valid license** | ❌ Not evident | Same as iOS – Ghana Gaming Commission or equivalent |
| **Geo-gating** | ❌ Not implemented | Restrict to Ghana (and any other licensed countries) |
| **Age-gating** | ❌ Not implemented | Block under-18 users from real-money features |
| **Content rating** | ❌ Not set in app.json | Rate as Adult (18+) or equivalent via IARC |
| **Responsible gambling** | ❌ Not implemented | Add links to support (e.g. GamCare, local helplines) |
| **Developer verification** | ⚠️ Unknown | Prepare ID, business docs, and license for Play Console |

### Ghana-Specific

- Ghana **is** in the list of countries where gambling apps can be distributed.
- Betika Ghana and similar apps are on Play Store with a Gaming Commission of Ghana license.
- You need equivalent licensing and documentation.

---

## 4. Feature-by-Feature Risk

| Feature | iOS Risk | Android Risk | Notes |
|---------|----------|--------------|-------|
| **Wallet + Paystack deposit** | Medium | Low | Apple may question external payment for in-app currency |
| **IAP top-up** | Medium | Low | If treated as gambling, IAP for currency may be disallowed |
| **Marketplace (buy picks)** | High | High | Real-money purchases tied to betting outcomes |
| **Escrow / payout on result** | High | High | Direct link to gambling mechanics |
| **Withdrawals** | Medium | Medium | Standard for licensed operators |
| **Subscriptions** | Medium | Medium | Same licensing and age rules apply |
| **Leaderboard** | Low | Low | Informational |
| **Tipster profiles** | Low | Low | Informational |
| **Push notifications** | Low | Low | Standard |

---

## 5. What You Need Before Launch

### Must-Have (Blockers)

1. **Gambling / tipster license**  
   - From Gaming Commission of Ghana (or equivalent) for your business model.  
   - Prepare license certificate and supporting docs for both stores.

2. **Age verification (18+)**  
   - Gate before wallet, marketplace, purchases.  
   - Options: date-of-birth at registration, declaration, or third-party age check.

3. **Geo-restriction**  
   - Only allow access from Ghana (and any other licensed countries).  
   - Use IP/region checks and/or store-level country targeting.

4. **Content rating**  
   - Set 17+ (iOS) / 18+ (Android) and complete IARC questionnaire.  
   - Declare gambling, real-money, and similar content.

5. **Legal pages**  
   - Terms of Service and Privacy Policy (you have URLs).  
   - Add: responsible gambling policy, age restriction, licensing info, and disclaimers.

### Should-Have (Reduces Rejection Risk)

6. **Responsible gambling**  
   - In-app links to GamCare, local helplines, self-exclusion.  
   - Short “gamble responsibly” message near wallet and marketplace.

7. **Clear positioning**  
   - In app and store listing: “For entertainment / informational purposes,” “No guarantee of winnings,” “Betting involves risk.”  
   - Helps if reviewers treat you as “tips” rather than pure gambling.

8. **Payment clarity**  
   - Document why Paystack is used (e.g. Ghana market, local payment methods).  
   - If Apple pushes back, be ready to discuss IAP vs external payment with App Review.

### Nice-to-Have

9. **App Store / Play Store listing**  
   - Clear description, screenshots, and compliance-focused keywords.  
   - Mention license and age restriction.

10. **Support contact**  
    - Visible support email or form for users and store reviewers.

---

## 6. Recommended Implementation Order

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Obtain legal advice and license (Ghana or other target markets) | 2–8 weeks |
| 2 | Add 18+ age gate at registration / first launch | 1–2 days |
| 3 | Implement geo-restriction (backend + app) | 1–2 days |
| 4 | Add responsible gambling section and links | 0.5 day |
| 5 | Update Terms/Privacy with gambling disclaimers | 0.5 day |
| 6 | Set content rating (17+/18+) in store consoles | 0.5 day |
| 7 | Prepare license and business docs for store verification | 1–2 days |
| 8 | Submit to App Store and Play Store | 1–2 weeks review |

---

## 7. Positioning to Minimize Risk

If you want to reduce the chance of being classified as pure gambling:

- **Emphasize:** “Betting tips and analysis,” “educational,” “decision support,” “no direct betting.”
- **Avoid:** “Guaranteed wins,” “make money,” “gambling platform.”
- **Reality check:** You still have real-money wallet, purchases, and payouts tied to results. Stores may still treat you as gambling. Licensing and compliance are non-negotiable.

---

## 8. Summary

| Question | Answer |
|----------|--------|
| **Will iOS approve as-is?** | **No.** Missing license, age verification, geo-restriction, and gambling disclaimers. |
| **Will Android approve as-is?** | **No.** Same gaps. |
| **Can features cause problems?** | **Yes.** Wallet, marketplace, escrow, and payments are high-risk without proper licensing and compliance. |
| **Path to approval?** | License → age gate → geo-restriction → disclaimers → content rating → store submission. |
| **Timeline to launch?** | Roughly 4–12 weeks, depending on license and legal review. |

**Next step:** Consult a lawyer familiar with Ghana gaming law and app store policies, then implement the must-have items above before submitting.
