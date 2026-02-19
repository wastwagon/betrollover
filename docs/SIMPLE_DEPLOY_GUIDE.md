# Simple deployment guide (Coolify + GitHub)

**You:** One person (or small team), project is live on a VPS with Coolify.  
**Branch:** You use only **main**. Coolify deploys from **main**.  
**This is fine.** You don’t need more branches unless you want them later.

---

## How your setup works (in plain words)

1. Your code lives on **GitHub** in the repo (e.g. `wastwagon/betrollover`).
2. The **main** branch is the one Coolify watches.
3. When you (or someone) **push** new code to **main** on GitHub, Coolify can **redeploy** your app so the live site uses the new code.

So: **main** = what’s live (and what Coolify uses).

---

## Test before you commit (optional but recommended)

Run these from **Command Prompt** or **PowerShell** (open the project folder first, e.g. `cd C:\Users\You\Downloads\BetRolloverNew` or wherever your project is).

**Option 1 — One script**
- **Windows (Command Prompt):** Open Command Prompt, go to your project folder, then run:
  ```cmd
  scripts\test-before-commit.cmd
  ```
- **Mac/Linux or Git Bash on Windows:** In Terminal (or Git Bash), from the project folder:
  ```bash
  bash scripts/test-before-commit.sh
  ```

**Option 2 — Step by step (Command Prompt / PowerShell):**
```bash
cd packages\shared-types
npm run build
cd ..\..
cd backend
npm run build
npm test
cd ..
cd web
npm run build
cd ..
```
If any step fails, fix the error before committing. If everything passes, you’re good to commit and push.

---

## When you want to update the live site

**Goal:** Get your latest code from your computer onto GitHub **main**, so Coolify can deploy it.

### Option A: Using GitHub Desktop (easiest)

1. Open **GitHub Desktop** and make sure your **betrollover** repo is selected (and branch is **main**).
2. You’ll see your changed files listed on the left. If you want to commit **all** of them, leave them all checked (or use “Select all”).
3. At the bottom left, fill in:
   - **Summary (required):** Short line describing the update, e.g.  
     `Subscriptions, push, IAP, API versioning and template updates`
   - **Description (optional):** You can leave this empty, or add something like  
     `Subscription packages, push notifications, in-app purchases, shared types, CHANGELOG, deploy guide.`
4. Click the blue **“Commit to main”** (or “Commit X files to main”) button.
5. After the commit appears in the history, click **“Push origin”** (top right) to send the changes to GitHub. Log in with your GitHub account (e.g. Gmail) if it asks.
6. In **Coolify**, your app should redeploy automatically if it’s set to deploy on push—or click **Redeploy** for your app.

Your **live site** will then be running the new code from **main**.

### Option B: Using Terminal / Command Line

1. **On your computer**, in the project folder (where you have the code):
   - Make sure you’ve saved all your work.
2. **Push to GitHub:**
   - Open Terminal (or Command Prompt).
   - Go to the project folder, for example:
     ```bash
     cd /Users/OceanCyber/Downloads/BetRolloverNew
     ```
   - Then run:
     ```bash
     git add -A
     git commit -m "Update project: subscriptions, push, IAP, template alignment"
     git push origin main
     ```
   - If GitHub asks for login, use your **Gmail-linked GitHub account** (or the username/password or token GitHub gives you).
3. **In Coolify:** Coolify should redeploy automatically, or click “Redeploy.”

After that, your **live site** is running the new code from **main**.

---

## What to avoid (so you don’t break the live site)

- **Don’t delete the main branch** on GitHub.
- **Don’t force-push** to main (`git push --force`) unless someone who knows Git tells you exactly why and how.
- **Don’t rename or remove** the GitHub repo (e.g. `wastwagon/betrollover`) that Coolify is connected to.

If you stick to normal **commit** and **push to main**, you’re safe.

---

## If you’re not sure whether your computer has the latest from GitHub

Before you make new changes, you can pull the latest **main**:

```bash
cd /Users/OceanCyber/Downloads/BetRolloverNew
git pull origin main
```

That way your local folder matches what’s on GitHub (and what Coolify is using).

---

## Optional: “Releases” on GitHub (for a history of versions)

You don’t have to do this to keep the site running. It’s only useful if you want a clear history of “what we released when.”

- We already have a **CHANGELOG.md** in the project that lists what changed.
- If later you want a **Release** on GitHub (with a tag like `v1.1.0`), you can do it from the GitHub website:
  1. Open your repo on GitHub.
  2. Click **Releases** → **Create a new release**.
  3. Choose a tag (e.g. `v1.1.0`) and write a short title and description (you can copy from CHANGELOG).
  4. Publish.

Your **live site and Coolify don’t depend on creating Releases**; they only depend on **main** having the right code.

---

## Summary

| What you have | Is it OK? |
|---------------|-----------|
| Only one branch: **main** | Yes. Fine for your setup. |
| Coolify deploys from **main** | Yes. That’s the right branch to use. |
| No Releases yet on GitHub | OK. Site works without them. You can add later if you want. |

**When you want to update the live site:**  
Save your work → `git add -A` → `git commit -m "short description"` → `git push origin main` → let Coolify redeploy (or click Redeploy).

If you tell me your next step (e.g. “I want to push my current project to GitHub” or “I want to redeploy in Coolify”), I can give you the exact commands or clicks for that, one at a time.
