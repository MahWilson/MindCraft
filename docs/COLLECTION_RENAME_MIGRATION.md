# Collection Rename Migration Guide

This guide explains how to migrate your Firestore collections from plural to singular names while preserving all data and structure.

## Overview

The migration renames these collections:
- `users` → `user`
- `courses` → `course`
- `modules` → `module`
- `lessons` → `lesson`
- `enrollments` → `enrollment`
- `assessments` → `assessment`
- `assignments` → `assignment`
- `submissions` → `submission`
- `settings` → `setting`

## Prerequisites

1. ✅ All code has been updated to use singular collection names (already done)
2. ✅ You have a `.env` file with Firebase configuration
3. ✅ You have write access to your Firestore database
4. ✅ You have backed up your data (recommended)

## Step 1: Environment Variables

The script uses environment variables from your `.env` file. Make sure your `.env` file contains:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Note:** If you're using Next.js, these variables are already loaded. If running as a standalone Node.js script, you may need to install `dotenv`:

```bash
npm install dotenv
```

Then uncomment the dotenv lines in `scripts/rename-collections.js`.

## Step 2: Update Firestore Security Rules (Temporary)

Before running the migration, you need to temporarily allow writes to both old and new collections. 

**Option A: Use Test Rules (Recommended for Migration)**

Go to Firebase Console → Firestore Database → Rules and temporarily use:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow all authenticated writes for migration
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ IMPORTANT:** After migration, restore the proper security rules from `docs/FIRESTORE_SECURITY_RULES.md`!

## Step 3: Run the Migration Script

### Basic Migration (Preserves Old Collections)

```bash
node scripts/rename-collections.js
```

This will:
- Copy all documents from plural collections to singular collections
- Preserve document IDs
- Preserve all data and structure
- Keep old collections intact for verification

### Migration with Auto-Delete (Removes Old Collections)

```bash
node scripts/rename-collections.js --delete-old
```

This will do the same as above, but also delete the old collections after successful migration.

**⚠️ WARNING:** Only use `--delete-old` after you've verified the migration was successful!

## Step 4: Verify Migration

1. Go to Firebase Console → Firestore Database
2. Check that all new singular collections exist:
   - `user` (should have same documents as old `users`)
   - `course` (should have same documents as old `courses`)
   - `module`, `lesson`, `enrollment`, `assessment`, `assignment`, `submission`, `setting`
3. Spot-check a few documents to ensure data is intact
4. Test your application to ensure everything works

## Step 5: Restore Security Rules

After verification, restore the proper security rules:

1. Go to Firebase Console → Firestore Database → Rules
2. Copy the rules from `docs/FIRESTORE_SECURITY_RULES.md`
3. Paste and click "Publish"

## Step 6: Delete Old Collections (If Not Auto-Deleted)

If you didn't use `--delete-old`, manually delete old collections:

1. Go to Firebase Console → Firestore Database
2. For each old collection (`users`, `courses`, etc.):
   - Click on the collection
   - Select all documents (if any remain)
   - Click "Delete"
   - Confirm deletion

## Troubleshooting

### "Missing or insufficient permissions"

- Make sure you've updated Firestore Security Rules to allow writes (see Step 2)
- Verify your `.env` file has correct Firebase credentials
- Check that you're authenticated in Firebase Console

### "Collection not found"

- This is normal if a collection doesn't exist yet
- The script will skip empty collections

### "Batch write failed"

- Firestore has a limit of 500 operations per batch
- The script handles this automatically, but if you have very large collections, you may need to run it multiple times
- Check Firebase Console for any rate limiting messages

### Data Not Appearing

- Wait a few seconds for Firestore to sync
- Refresh the Firebase Console
- Check the browser console for any errors

## Rollback Plan

If something goes wrong:

1. **Old collections are preserved** (unless you used `--delete-old`)
2. You can manually copy documents back if needed
3. Or restore from a backup if you created one

## Alternative: Manual Migration via Firebase Console

If you prefer to migrate manually:

1. Go to Firebase Console → Firestore Database
2. For each collection:
   - Click on the collection (e.g., `users`)
   - Export the data (if needed for backup)
   - Create a new collection with singular name (e.g., `user`)
   - Copy each document manually:
     - Click on a document
     - Copy all fields
     - Create new document in singular collection with same ID
     - Paste all fields
   - Repeat for all documents
   - Delete old collection after verification

**Note:** This is very time-consuming for large collections. The script is much faster!

## After Migration

Once migration is complete:

1. ✅ All code uses singular collection names (already done)
2. ✅ Firestore Security Rules updated (see Step 5)
3. ✅ Storage Rules updated (already done in code)
4. ✅ Old collections deleted (see Step 6)
5. ✅ Application tested and working

Your database is now using singular collection names as requested by your lecturer! 🎉

