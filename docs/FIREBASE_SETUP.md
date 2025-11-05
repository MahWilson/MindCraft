# Firebase Configuration

## Current Setup

- **Firebase Auth**: Email/Password authentication enabled
- **Firestore**: Database created with Security Rules configured
- **Collections**: `users`, `courses`

## Data Model

### Users Collection
- Document ID: User UID (from Firebase Auth)
- Fields: `name`, `email`, `role` (admin/teacher/student), `status`, `createdAt`

### Courses Collection
- Document ID: Auto-generated
- Fields: `title`, `description`, `status` (draft/published), `modules[]`, `createdBy`, `authorName`, `authorEmail`, `createdAt`, `updatedAt`

## Security Rules Reference

Current Firestore Security Rules enforce:
- Users: Read own profile, admins can update/delete any
- Courses: Read published (all), read drafts (admin/teacher), create (admin/teacher), update/delete (owner or admin)

## 👥 Adding Team Members to Firebase Project

### Step 1: Add Team Member to Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mindcraft-f14ac`
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Select **Users and permissions**
5. Click **Add user**
6. Enter the team member's email address
7. Select a role:
   - **Editor** (recommended for developers - can manage resources)
   - **Viewer** (read-only access, good for testing)
8. Click **Add**

### Step 2: Team Member Gets Firebase Config

After being added, team members can:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: `mindcraft-f14ac`
3. Click the **gear icon** → **Project settings**
4. Scroll down to **Your apps** section
5. If no web app exists, click **Add app** → **Web** (</>) icon
6. Copy the Firebase config values
7. Create `.env` file in project root with these values

### Step 3: Team Member Creates .env File

Team members should create `.env` file in project root with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_APP_ID=<value from Firebase Console>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<value from Firebase Console>
```

## 🔧 Team Member Setup Guide

### Option A: Team Member Gets Config from Firebase Console (Recommended)

If team members are added to Firebase project:
1. They can access Firebase Console
2. Get config values from Project Settings
3. Create their own `.env` file
4. No need to share `.env` file

### Option B: Share .env File (Alternative)

If you prefer to share the `.env` file directly:
- Share via secure channel (Slack, email, password manager)
- Team members copy it to project root
- Simpler but less secure

## 📝 Important Notes

### Firestore Timestamps
- Firestore timestamps are objects, not strings
- Use `.toDate()` to convert: `course.createdAt?.toDate()`
- We handle this in components that display dates

### Authentication
- Firebase Auth persists across page refreshes
- User role is fetched from Firestore `users` collection
- Sign out clears Firebase Auth session and cookies

