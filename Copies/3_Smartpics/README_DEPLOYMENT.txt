BETROLLOVER - PRODUCTION DEPLOYMENT
===================================

📦 This folder contains ALL production-ready files for deployment to:
   https://www.betrollover.com

📁 UPLOAD TO: /home/betrollover/public_html/

🚀 DEPLOYMENT STEPS:
====================

1. UPLOAD ALL FILES
   - Upload entire contents of this "production" folder
   - Upload to: public_html/ (via cPanel File Manager or FTP)
   - Maintain folder structure

2. SET PERMISSIONS (via cPanel File Manager)
   - storage/logs/ → 777
   - storage/cache/ → 777
   - storage/uploads/ → 777
   - storage/uploads/avatars/ → 777

3. IMPORT DATABASE
   - File: betrollover_production_database.sql
   - Via phpMyAdmin: https://www.betrollover.com/phpmyadmin/
   - Database: betrollover_workingdata
   - Import → Choose File → Go

4. VERIFY CONFIG
   - File: config/config.php (already configured)
   - Database: betrollover_workingdata
   - User: betrollover_workinguser
   - Password: x3MwB%^UuUPh

5. TEST
   - Visit: https://www.betrollover.com
   - Test registration, login, dashboard

📋 FILES INCLUDED:
==================
✅ index.php (Main entry point)
✅ login.php (Login page)
✅ paystack_webhook.php (Payment webhook)
✅ .htaccess (URL rewriting, security)
✅ betrollover_production_database.sql (Database export)
✅ app/ (All controllers, models, views)
✅ config/ (Production configuration)
✅ api/ (API endpoints)
✅ public/ (CSS, JS, images)
✅ storage/ (Logs, cache, uploads - set 777)

❌ FILES EXCLUDED (Not needed for production):
- Debug files
- Test files
- Local configs
- SQL migration files
- Documentation files

🔒 SECURITY ENABLED:
===================
✅ Error display: OFF
✅ Error logging: ON
✅ Secure sessions: ON
✅ SQL injection protection: ON
✅ XSS protection: ON

⚡ OPTIMIZED FOR:
================
✅ Performance
✅ Security
✅ Production environment

📞 SUPPORT:
===========
If issues occur, check: storage/logs/error.log

✅ READY FOR DEPLOYMENT!

