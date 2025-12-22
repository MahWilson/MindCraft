# Import Sample Data Instructions

This guide explains how to import the sample database courses data into your Firestore database.

## Prerequisites

1. **Firebase Project Setup**: Make sure your Firebase project is configured and `.env` file contains all `NEXT_PUBLIC_FIREBASE_*` variables.

2. **Firebase Auth Account**: You need an admin or teacher account in Firebase Authentication to import data.

3. **Sample Data File**: The `SAMPLE_DATA_DATABASE_COURSES.txt` file should be in the project root.

## Installation

If you don't have `dotenv` installed, install it:

```bash
npm install dotenv
```

## Method 1: Command Line Arguments (Recommended)

Pass your credentials directly as arguments:

```bash
npm run import:sample-data your-email@example.com your-password
```

Or with node directly:
```bash
node scripts/import-sample-data.js your-email@example.com your-password
```

## Method 2: Interactive Prompt

If you don't provide credentials, the script will prompt you:

```bash
npm run import:sample-data
```

Then enter your email and password when prompted.

## Method 3: Environment Variables (Optional Fallback)

You can also set environment variables as a fallback:

**Windows (PowerShell):**
```powershell
$env:FIREBASE_EMAIL="your-admin@email.com"
$env:FIREBASE_PASSWORD="your-password"
npm run import:sample-data
```

**Windows (CMD):**
```cmd
set FIREBASE_EMAIL=your-admin@email.com
set FIREBASE_PASSWORD=your-password
npm run import:sample-data
```

**Linux/Mac:**
```bash
FIREBASE_EMAIL="your-admin@email.com" FIREBASE_PASSWORD="your-password" npm run import:sample-data
```

## What the Script Does

1. ✅ Reads `SAMPLE_DATA_DATABASE_COURSES.txt` from project root
2. ✅ Parses courses, modules, and lessons
3. ✅ Creates courses in Firestore `course` collection
4. ✅ Creates modules in Firestore `module` collection (linked to courses)
5. ✅ Creates lessons in Firestore `lesson` collection (linked to modules)
6. ✅ Updates courses and modules with their associated IDs

## Expected Output

The script will show progress like:

```
🚀 Starting sample data import...

📋 Loading Firebase configuration...
✅ Firebase config loaded

🔐 Signing in as: admin@mindcraft.local
✅ Signed in successfully

📖 Reading sample data file...
🔍 Parsing sample data...
✅ Parsed 3 courses:
   1. Introduction to Databases (2 modules, 6 lessons)
   2. SQL Fundamentals (3 modules, 9 lessons)
   3. Advanced Database Design (3 modules, 9 lessons)

📚 Starting import of 3 courses...

[1/3] Creating course: "Introduction to Databases"
  ✅ Course created: abc123
  📦 Creating module 1: "What is a Database?"
    ✅ Module created: def456
    📄 Creating lesson 1: "Understanding Data and Information"
      ✅ Lesson created: ghi789
    ...
  ✅ Course "Introduction to Databases" completed with 2 modules

...

🎉 Import completed! Created 3 courses.
✨ All done! You can now view the courses in your application.
```

## Troubleshooting

### Error: "Firebase config not found"
- Make sure your `.env` file contains all `NEXT_PUBLIC_FIREBASE_*` variables
- Check that the variables are loaded correctly

### Error: "Email and password are required"
- Pass credentials as command line arguments: `npm run import:sample-data email@example.com password`
- Or the script will prompt you interactively if no arguments are provided
- You can also set `FIREBASE_EMAIL` and `FIREBASE_PASSWORD` environment variables as a fallback

### Error: "Invalid login credentials"
- Make sure the email and password are correct
- The account must exist in Firebase Authentication
- The account should have admin or teacher role (for proper permissions)

### Error: "No courses found in sample data file"
- Check that `SAMPLE_DATA_DATABASE_COURSES.txt` exists in the project root
- Verify the file format matches the expected structure

### Import partially fails
- The script creates courses, modules, and lessons in order
- If it fails partway, you may need to manually delete partially created data
- Check Firestore console to see what was created

## Notes

- The script uses Firebase Web SDK (same as your app)
- All courses will be created with status "published" (as specified in sample data)
- All courses will be linked to the user account you sign in with
- The script preserves the order of modules and lessons as specified in the sample data

## After Import

1. Check your Firestore console to verify all data was imported
2. View courses in your application at `/dashboard/courses` or `/admin/courses`
3. Test that modules and lessons are properly linked
4. Verify that students can view published courses

