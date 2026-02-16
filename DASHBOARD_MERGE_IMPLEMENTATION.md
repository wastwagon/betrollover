# Dashboard Merge & ROI-Based Pricing Implementation

## Overview
This document summarizes the implementation of merging user and tipster dashboards, implementing ROI-based pricing for coupons, and converting all users to tipsters.

## Changes Implemented

### 1. Database Changes

#### Migration Script: `database/migrations/convert_users_to_tipsters.sql`
- Converts all users with role 'user' to 'tipster'
- Adds `minimum_roi` column to `api_settings` table (default: 20.0%)

**To Run Migration:**
```sql
-- Run the migration script
\i database/migrations/convert_users_to_tipsters.sql
```

### 2. Backend Changes

#### A. Admin Settings - Minimum ROI
- **File**: `backend/src/modules/admin/entities/api-settings.entity.ts`
  - Added `minimumROI` column (DECIMAL(5,2), default: 20.0)

- **File**: `backend/src/modules/admin/admin.service.ts`
  - Added `updateMinimumROI()` method
  - Updated `getSettings()` to include `minimumROI`

- **File**: `backend/src/modules/admin/admin.controller.ts`
  - Added `PATCH /admin/settings/minimum-roi` endpoint

#### B. ROI Calculation Fix
- **File**: `backend/src/modules/tipster/tipster.service.ts`
  - Fixed ROI calculation: `((Total Returns - Total Investment) / Total Investment) * 100`
  - Assumes 1 GHS investment per pick for ROI calculation
  - Removed role check - all users can get stats

#### C. Pick Creation - ROI Validation
- **File**: `backend/src/modules/accumulators/accumulators.service.ts`
  - Default price to 0 (free) if not provided or invalid
  - Validates ROI before allowing price > 0
  - Throws error if ROI < minimum ROI with helpful message
  - Added dependencies: `TipsterService`, `ApiSettings`

- **File**: `backend/src/modules/accumulators/accumulators.controller.ts`
  - Removed role check - all users can create picks

- **File**: `backend/src/modules/accumulators/accumulators.module.ts`
  - Added `TipsterModule` and `ApiSettings` imports

### 3. Frontend Changes

#### A. Dashboard Merge
- **File**: `web/app/dashboard/page.tsx`
  - Removed `BecomeTipsterCard` import and usage
  - All users see tipster stats (ROI, Win Rate, Total Picks, Wallet Balance)
  - Removed role-based conditional rendering
  - "Create Pick" card always visible for all users

#### B. Create Pick Page
- **File**: `web/app/create-pick/page.tsx`
  - Removed tipster/admin role check
  - All authenticated users can access create pick page

#### C. Admin Settings - Minimum ROI UI
- **File**: `web/app/admin/settings/page.tsx`
  - Added Minimum ROI card in Platform Configuration section
  - Input field with save button
  - Shows current minimum ROI value
  - Updates via API call to `/admin/settings/minimum-roi`

## Key Features

### 1. Unified Dashboard
- **Before**: Separate dashboards for users and tipsters
- **After**: Single dashboard showing tipster stats for everyone
- All users can create picks and make earnings

### 2. ROI-Based Pricing
- **Default**: All coupons are free (price = 0)
- **Paid Coupons**: Users can only set price > 0 if their ROI >= minimum ROI
- **Minimum ROI**: Configurable by admin (default: 20%)
- **Error Message**: Clear message when ROI requirement not met

### 3. ROI Calculation
- **Formula**: `((Total Returns - Total Investment) / Total Investment) * 100`
- **Investment**: Assumes 1 GHS per pick for calculation
- **Returns**: Based on `totalOdds` when pick is won
- **Only Settled Picks**: Only counts picks with result 'won' or 'lost'

## User Flow

### Creating a Free Pick
1. User navigates to "Create Pick"
2. Selects fixtures and markets
3. Sets price to 0 (or leaves empty)
4. Submits - pick created successfully

### Creating a Paid Pick (ROI >= Minimum)
1. User navigates to "Create Pick"
2. Selects fixtures and markets
3. Sets price > 0
4. System checks ROI
5. If ROI >= minimum ROI: Pick created successfully
6. If ROI < minimum ROI: Error message shown with current ROI and requirement

### Admin Setting Minimum ROI
1. Admin navigates to Settings
2. Views current Minimum ROI value
3. Updates value in input field
4. Clicks "Save Minimum ROI"
5. System validates (0-1000 range)
6. Updates database
7. New value applies to all future pick creations

## API Endpoints

### New Endpoints
- `PATCH /admin/settings/minimum-roi`
  - Body: `{ minimumROI: number }`
  - Requires: Admin role
  - Validates: 0 <= minimumROI <= 1000

### Modified Endpoints
- `POST /accumulators`
  - Now accepts requests from all authenticated users (not just tipsters)
  - Validates ROI if price > 0
  - Defaults price to 0 if not provided

- `GET /tipster/stats`
  - Now returns stats for all users (no role check)

## Database Schema

### api_settings table
```sql
ALTER TABLE api_settings 
ADD COLUMN IF NOT EXISTS minimum_roi DECIMAL(5,2) DEFAULT 20.0;
```

### users table
```sql
-- All users converted to tipsters
UPDATE users SET role = 'tipster' WHERE role = 'user';
```

## Testing Checklist

- [ ] Run migration script to convert users and add minimum_roi column
- [ ] Verify all users can access dashboard and see stats
- [ ] Verify all users can create free picks
- [ ] Verify users with ROI < minimum cannot create paid picks
- [ ] Verify users with ROI >= minimum can create paid picks
- [ ] Verify admin can update minimum ROI setting
- [ ] Verify ROI calculation is accurate
- [ ] Verify error messages are clear and helpful

## Notes

- ROI calculation uses settled picks only (won/lost)
- Free picks (price = 0) don't require ROI check
- Minimum ROI is platform-wide setting (not per-user)
- All existing users are automatically converted to tipsters via migration
