# Firebase Storage Setup

## How to Navigate to Storage Rules

### Step 1: Go to Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mindcraft-f14ac`

### Step 2: Navigate to Storage (NOT Firestore)
1. In the **left sidebar**, look for **"Storage"** (it's a separate section from Firestore)
2. Click on **"Storage"** in the left sidebar
3. You should see a page with tabs: **"Files"**, **"Rules"**, **"Usage"**
4. Click on the **"Rules"** tab

**Important:** 
- **Firestore Database** = Database rules (for documents)
- **Storage** = File upload rules (for PDFs, images, etc.)
- These are **completely separate**!

### Step 3: Add Security Rules

**Use the rules below for basic functionality.**

Once you're in **Storage → Rules**, replace the default rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserRole() {
      let userDoc = get(/databases/(default)/documents/users/$(request.auth.uid));
      return userDoc != null && userDoc.data != null && 'role' in userDoc.data
             ? userDoc.data.role
             : null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'admin';
    }
    
    function isTeacher() {
      return isSignedIn() && 
             exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'teacher';
    }
    
    function isTeacherOrAdmin() {
      return isTeacher() || isAdmin();
    }
    
    function isStudent() {
      return isSignedIn() && 
             exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'student';
    }
    
    // Profile pictures: users can upload/read their own, admins can read any
    match /profile-pictures/{userId}/{allPaths=**} {
      allow write: if isSignedIn() && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }
    
    // App logo: only admins can upload, everyone can read
    match /app-logo/{allPaths=**} {
      allow write: if isAdmin()
                   && request.resource.size < 2 * 1024 * 1024  // 2MB limit
                   && request.resource.contentType.matches('image/.*');
      allow read: if isSignedIn();
    }
    
    // Lesson materials: teachers and admins can upload/read, students can read
    match /lesson-materials/{moduleId}/{allPaths=**} {
      // Allow teachers and admins to upload lesson materials
      allow write: if isTeacherOrAdmin()
                   && request.resource.size < 10 * 1024 * 1024  // 10MB limit (to stay within free tier)
                   && (
                     request.resource.contentType == 'application/pdf' ||
                     request.resource.contentType == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     request.resource.contentType == 'application/msword' ||
                     request.resource.contentType == 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     request.resource.contentType == 'application/vnd.ms-powerpoint' ||
                     request.resource.contentType.matches('image/.*') ||
                     request.resource.contentType.matches('video/.*')
                   );
      
      // Allow teachers, admins, and students to read
      allow read: if isSignedIn() && (isTeacherOrAdmin() || isStudent());
      
      // Allow teachers and admins to delete
      allow delete: if isTeacherOrAdmin();
    }
    
    // Assignment submissions: students can upload, teachers/admins can read/delete
    match /assignment-submissions/{submissionId}/{allPaths=**} {
      // Students can upload assignment files (ownership validated in app code)
      allow write: if isStudent()
                   && request.resource.size < 10 * 1024 * 1024  // 10MB limit
                   && (
                     request.resource.contentType == 'application/pdf' ||
                     request.resource.contentType == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     request.resource.contentType == 'application/msword' ||
                     request.resource.contentType == 'application/zip' ||
                     request.resource.contentType == 'application/x-zip-compressed' ||
                     request.resource.contentType.matches('text/.*') ||
                     request.resource.contentType.matches('image/.*')
                   );
      
      // Students and teachers/admins can read submissions
      allow read: if isSignedIn() && (isStudent() || isTeacherOrAdmin());
      
      // Only teachers and admins can delete submissions
      allow delete: if isTeacherOrAdmin();
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Publish the Rules
1. Click the **"Publish"** button at the top of the Rules editor
2. Wait 10-30 seconds for the rules to propagate

### Step 5: Test
1. Go back to your app
2. Try uploading a file again
3. The CORS error should be gone

## Visual Guide: Finding Storage

If you can't find "Storage" in the sidebar:

1. **Look in the left sidebar** - Scroll down if needed
2. **Check "Build" section** - Storage might be under "Build" → "Storage"
3. **Use search** - There might be a search bar at the top of the sidebar
4. **Direct URL**: You can also go directly to: `https://console.firebase.google.com/project/mindcraft-f14ac/storage`

## What You Should See

When you're in the correct place (Storage → Rules):
- The page title should say **"Storage"** (not "Firestore Database")
- The URL should contain `/storage` (not `/firestore`)
- The tabs should be: **Files**, **Rules**, **Usage**
- The Rules tab should show a code editor with security rules

## Database Name Note

The rules above use `(default)` as the database name. If your Firestore database has a different name:
1. Go to Firestore Database (where you are now)
2. Look at the database selector at the top (should show "(default)" or your database name)
3. If it's NOT "(default)", replace `(default)` in the Storage rules with your actual database name

## Troubleshooting

### "I can't find Storage in the sidebar"
- Make sure you're in the Firebase Console (not Firestore console)
- Storage might be under "Build" section
- Try the direct URL: `https://console.firebase.google.com/project/mindcraft-f14ac/storage`

### "Storage is not enabled"
- If you don't see Storage at all, you may need to enable it first
- Go to Firebase Console → Project Settings → Make sure Storage is enabled
- Or go to Storage and click "Get Started" if it's not set up yet

### "Rules won't publish"
- Make sure there are no syntax errors (check for red underlines)
- Make sure you clicked "Publish" (not just "Save")
- Wait 30-60 seconds after publishing

### Still getting CORS errors
- Make sure you published the Storage rules (not Firestore rules)
- Wait 30-60 seconds for rules to propagate
- Check browser console for specific error messages
- Verify your user has `role: 'teacher'` or `role: 'admin'` in Firestore

## Supported File Types

### Lesson Materials (Teachers/Admins)
- **PDF**: `.pdf`
- **Word Documents**: `.docx`, `.doc`
- **PowerPoint**: `.pptx`, `.ppt`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`
- **Videos**: `.mp4`, `.mpeg`

### Assignment Submissions (Students)
- **PDF**: `.pdf`
- **Word Documents**: `.docx`, `.doc`
- **ZIP files**: `.zip` (for code projects)
- **Text files**: `.txt`, `.md`, `.py`, `.js`, `.java`, etc.
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`

## File Size Limits

- **Profile Pictures**: 5MB
- **Lesson Materials**: 10MB (to stay within free tier limits)
- **Assignment Submissions**: 10MB (to stay within free tier limits)

## Related Documentation

- **Firestore Security Rules**: See `docs/FIRESTORE_SECURITY_RULES.md` (for database access)
- **Firebase Setup**: See `docs/FIREBASE_SETUP.md`
