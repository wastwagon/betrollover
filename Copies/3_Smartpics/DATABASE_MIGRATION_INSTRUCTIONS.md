# Database Migration Instructions - Notification System

## ⚠️ IMPORTANT: SQL Files Are Protected

The SQL file is **NOT accessible via web browser** for security reasons. This is correct behavior!

The `.htaccess` file blocks access to:
- All `.sql` files
- `database/` directory
- Other sensitive files

---

## 📋 How to Run the Migration

### Option 1: Via phpMyAdmin (Recommended)

1. **Access phpMyAdmin:**
   - Login to cPanel
   - Click "phpMyAdmin"
   - Select database: `betrollover_workingdata`

2. **Run the SQL:**
   - Click on "SQL" tab
   - Copy the contents of: `database/migrations/create_notifications_system.sql`
   - Paste into the SQL text area
   - Click "Go" to execute

### Option 2: Via cPanel File Manager

1. **Download the SQL file:**
   - Login to cPanel
   - Open File Manager
   - Navigate to: `public_html/database/migrations/`
   - Download `create_notifications_system.sql`

2. **Import via phpMyAdmin:**
   - Open phpMyAdmin
   - Select database: `betrollover_workingdata`
   - Click "Import" tab
   - Choose the downloaded SQL file
   - Click "Go"

### Option 3: Via FTP

1. **Download via FTP:**
   - Connect via FTP client
   - Navigate to: `/public_html/database/migrations/`
   - Download `create_notifications_system.sql`

2. **Import via phpMyAdmin:**
   - Follow Option 2, Step 2

---

## ✅ What the Migration Creates

1. **`notifications` table** - Stores all user notifications
2. **`user_notification_preferences` table** - User notification settings
3. **`notification_reads` table** - Performance tracking
4. **Default preferences** - For all existing users

---

## 🔒 Security Note

The blank page you see is **intentional and correct**. SQL files should never be accessible via web browser. The `.htaccess` file protects these sensitive files.

---

## 📍 File Location

The SQL file is located at:
```
/home/betrollover/public_html/database/migrations/create_notifications_system.sql
```

But it's **protected** and can only be accessed via:
- FTP/cPanel File Manager (to download)
- phpMyAdmin (to execute)

---

## ✅ After Migration

Once the migration is complete:
1. Test notification bell icon on dashboard
2. Visit `/notifications` to manage preferences
3. Test creating a notification (e.g., approve a pick)

---

**Status:** SQL file is secure and ready to use via phpMyAdmin! 🔒

