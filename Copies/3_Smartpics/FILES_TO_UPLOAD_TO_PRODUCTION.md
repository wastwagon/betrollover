# 📦 Files to Upload to Production Server

## 🎯 Quick Upload Guide

**Location:** `/Users/OceanCyber/Downloads/Smartpickspro-new/production/`

**Upload to:** `public_html/` on your cPanel server

---

## ✅ Complete File List

### 1. **Root Files** (Upload to `public_html/`)
```
✅ index.php
✅ .htaccess (if exists)
✅ paystack_webhook.php
```

### 2. **app/** Directory (Upload entire folder to `public_html/app/`)
```
✅ app/controllers/ (all PHP files - 82 files)
✅ app/models/ (all PHP files - 27 files)
✅ app/middleware/ (AuthMiddleware.php)
✅ app/views/ (all subdirectories and files)
   - components/
   - helpers/
   - layouts/
   - pages/
   - shared/
   - ViewRenderer.php
```

### 3. **api/** Directory (Upload entire folder to `public_html/api/`)
```
✅ api/get_notifications.php
✅ api/mark_notification_read.php
✅ api/get_coupon_details.php
✅ api/get_pick_details.php
✅ api/get_chat_messages.php
✅ api/send_chat_message.php
✅ api/get_online_users.php
✅ api/search_tipsters.php
✅ api/increment_view_count.php
✅ api/get_ticket_picks.php
```

### 4. **config/** Directory (Upload to `public_html/config/`)
```
✅ config/config.php (IMPORTANT: Contains database credentials)
```

### 5. **public/** Directory (Upload entire folder to `public_html/public/`)
```
✅ public/css/
✅ public/js/
✅ public/images/
```

### 6. **storage/** Directory (Upload entire folder to `public_html/storage/`)
```
✅ storage/logs/
✅ storage/cache/
✅ storage/uploads/
   - avatars/
```

### 7. **database/** Directory (DO NOT UPLOAD - For reference only)
```
❌ database/migrations/ (Keep local, run via phpMyAdmin)
❌ database/seeds/ (Keep local, run via phpMyAdmin)
```

---

## 🚨 CRITICAL FILES (Must Upload)

These files were recently updated and MUST be uploaded:

### Recently Fixed Files:
1. ✅ `index.php` - Fixed routing and base URL detection
2. ✅ `app/controllers/create_pick.php` - Fixed form submission
3. ✅ `app/controllers/admin_settings.php` - Fixed database errors and alignment
4. ✅ `app/controllers/login.php` - Fixed session and base URL
5. ✅ `app/controllers/register.php` - Fixed session and base URL
6. ✅ `app/views/layouts/user_layout.php` - Added notifications
7. ✅ `app/views/layouts/admin_layout.php` - Added notifications
8. ✅ `app/views/layouts/tipster_layout.php` - Added notifications
9. ✅ `app/views/components/admin_menu.php` - Fixed base URL
10. ✅ `app/views/components/user_menu.php` - Fixed base URL
11. ✅ `app/views/components/tipster_menu.php` - Fixed base URL
12. ✅ `api/get_notifications.php` - Notification API
13. ✅ `api/mark_notification_read.php` - Notification API
14. ✅ `app/models/NotificationService.php` - Notification service
15. ✅ `app/controllers/notification_preferences.php` - Notification preferences page

---

## 📋 Upload Instructions

### Method 1: cPanel File Manager
1. Log into cPanel
2. Go to File Manager
3. Navigate to `public_html/`
4. Upload the entire `production` folder contents
5. **OR** upload each directory separately

### Method 2: FTP/SFTP
1. Connect to your server via FTP/SFTP
2. Navigate to `public_html/`
3. Upload all files maintaining the directory structure

### Method 3: ZIP Upload (Recommended)
1. Create a ZIP of the `production` folder
2. Upload ZIP to `public_html/`
3. Extract in cPanel File Manager
4. Delete ZIP file after extraction

---

## ⚠️ Important Notes

### DO NOT Upload:
- ❌ `database/` folder (run SQL files via phpMyAdmin instead)
- ❌ `*.md` files (documentation)
- ❌ `*.txt` files (documentation)
- ❌ `verify_menu_routes.php` (diagnostic script)
- ❌ `*.sql` files directly (import via phpMyAdmin)

### MUST Upload:
- ✅ All `.php` files
- ✅ All `.htaccess` files
- ✅ `config/config.php` (with production credentials)
- ✅ `storage/` folder (create if doesn't exist)
- ✅ `public/` folder (CSS, JS, images)

---

## 🔐 Security Checklist

After upload:
1. ✅ Verify `config/config.php` has production database credentials
2. ✅ Check `.htaccess` is protecting sensitive files
3. ✅ Verify file permissions (folders: 755, files: 644)
4. ✅ Test that `database/` folder is not accessible via web
5. ✅ Test that `config/config.php` is not accessible via web

---

## 📊 File Count Summary

- **PHP Files:** 157 files
- **SQL Files:** 4 files (import via phpMyAdmin)
- **Total Size:** ~3.2 MB

---

## 🎯 Quick Upload Command (if using SSH)

```bash
# From your local machine
cd /Users/OceanCyber/Downloads/Smartpickspro-new/production
tar -czf production.tar.gz --exclude='*.md' --exclude='*.txt' --exclude='database/' --exclude='*.sql' .
# Then upload production.tar.gz and extract on server
```

---

## ✅ Post-Upload Verification

After uploading, verify:
1. ✅ Homepage loads: `https://betrollover.com/`
2. ✅ Login works: `https://betrollover.com/login`
3. ✅ Registration works: `https://betrollover.com/register`
4. ✅ Dashboards load (user/admin/tipster)
5. ✅ Create Pick form submits
6. ✅ Settings page saves without errors
7. ✅ Notifications bell appears and works

---

**Last Updated:** Based on all recent fixes and updates

