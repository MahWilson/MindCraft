# Data Migration Guide: JSON → Firestore

## Overview

Your existing data in `data/*.json` files needs to be migrated to Firestore. Here's how to do it safely.

## Current Data

You have:
- **2 users** in `data/users.json` (student1, teach1)
- **2 courses** in `data/courses.json`
- **Admin credentials** in `data/admin.json`

## Migration Steps

### Step 1: Create Users in Firebase Auth

**⚠️ IMPORTANT:** Users must exist in Firebase Auth before they can be in Firestore.

#### Option A: Manual (Recommended for First Time)

1. Go to Firebase Console → Authentication → Users
2. Click **Add user** for each user:
   - **student1@gmail.com** - password of your choice
   - **teach1@gmail.com** - password of your choice
3. **Copy the User UIDs** (you'll need these!)

#### Option B: Via Your App (After Admin Setup)

1. Create your admin user first (see FIREBASE_SETUP.md)
2. Sign in as admin
3. Go to `/admin/register`
4. Register each user (student1, teach1)
5. Note their UIDs from Firebase Console

### Step 2: Create User Profiles in Firestore

For each user, create a document in `users` collection:

1. Go to Firebase Console → Firestore Database → Data
2. Click **Start collection** (if `users` doesn't exist)
3. Collection ID: `users`
4. For each user:
   - Document ID: **Paste the User UID from Step 1**
   - Add fields:
     - `name` (string): "student1" or "teach1"
     - `email` (string): "student1@gmail.com" or "teach1@gmail.com"
     - `role` (string): "student" or "teacher"
     - `status` (string): "active"
     - `createdAt` (timestamp): Set to current time

### Step 3: Create Admin User

**For admin account:**

1. Go to Firebase Console → Authentication → Users
2. Click **Add user**
3. Email: `admin@mindcraft.local` (or your choice)
4. Password: `admin123` (or your choice)
5. Copy the **User UID**

6. Go to Firestore → `users` collection
7. Create document with:
   - Document ID: **Admin's User UID**
   - Fields:
     - `name` (string): "Admin"
     - `email` (string): "admin@mindcraft.local"
     - `role` (string): "admin"
     - `status` (string): "active"
     - `createdAt` (timestamp): current time

### Step 4: Migrate Courses

**Option A: Manual (Quick)**

1. Go to Firestore → `courses` collection
2. Click **Add document**
3. For each course from `data/courses.json`:

   **Course 1: "Test Course 1"**
   - Document ID: Auto-generate (or use existing UUID)
   - Fields:
     - `title` (string): "Test Course 1"
     - `description` (string): "testing1"
     - `status` (string): "published"
     - `modules` (array): [] (empty array)
     - `createdBy` (string): null (or admin's UID if you want)
     - `authorName` (string): "Admin" (or "Unknown")
     - `authorEmail` (string): "" (or admin email)
     - `createdAt` (timestamp): 2025-11-04T17:34:19.915Z
     - `updatedAt` (timestamp): 2025-11-04T17:47:25.850Z

   **Course 2: "dasdasd"**
   - Document ID: Auto-generate
   - Fields:
     - `title` (string): "dasdasd"
     - `description` (string): "sdadas"
     - `status` (string): "draft"
     - `modules` (array): []
     - `createdBy` (string): **teach1's User UID** (from Step 1)
     - `authorName` (string): "teach1"
     - `authorEmail` (string): "teach1@gmail.com"
     - `createdAt` (timestamp): 2025-11-04T17:49:16.743Z
     - `updatedAt` (timestamp): 2025-11-04T17:49:16.743Z

**Option B: Use Migration Script (Advanced)**

1. Update `scripts/migrate-to-firestore.js` with your User UIDs
2. Run: `node scripts/migrate-to-firestore.js`
3. Note: This requires Firebase Admin SDK setup (more complex)

### Step 5: Test Migration

1. **Test Login:**
   ```bash
   npm run dev
   ```
   - Sign in as `teach1@gmail.com` with your password
   - Should see courses in `/admin/courses`
   - Should be able to edit "dasdasd" course

2. **Test Admin:**
   - Sign in as admin
   - Should see all courses

3. **Verify Data:**
   - Check Firestore Console → should see all users and courses
   - Compare with old JSON files

## What to Do With Old JSON Files

**Option 1: Archive (Recommended)**
```bash
mkdir data/archive
mv data/users.json data/courses.json data/admin.json data/archive/
```

**Option 2: Keep as Backup**
- Leave them in `data/` folder
- They won't be used anymore
- Good for reference

**Option 3: Delete (After Verification)**
- Only delete after confirming everything works in Firestore
- Make sure you have backups elsewhere

## Quick Migration Checklist

- [ ] Create users in Firebase Auth (student1, teach1, admin)
- [ ] Copy User UIDs from Firebase Console
- [ ] Create user profiles in Firestore `users` collection
- [ ] Migrate courses to Firestore `courses` collection
- [ ] Link `createdBy` fields to correct User UIDs
- [ ] Test login with all users
- [ ] Verify courses appear correctly
- [ ] Archive or backup old JSON files

## Troubleshooting

**"User not found" when logging in:**
- Check if user exists in Firebase Auth
- Check if user profile exists in Firestore `users` collection
- Verify the UID matches

**Courses not showing:**
- Check `createdBy` field matches a valid User UID
- Verify Firestore Security Rules allow read
- Check browser console for errors

**"Permission denied":**
- Check Firestore Security Rules
- Make sure user is authenticated
- Verify user role in Firestore matches expected role

## Next Steps After Migration

1. ✅ Remove dependency on JSON files (already done in code)
2. ✅ Test all functionality
3. ✅ Update team members on new login process
4. ✅ Document new user creation process
5. ✅ Set up proper Firestore Security Rules (see FIREBASE_SETUP.md)

