# Firestore Security Rules

## ⚠️ IMPORTANT: Replace the Default Rules

The default Firebase rules allow public access to everything, which is **NOT secure**. Use the rules below instead.

## Current Production Rules

These are the **latest and most up-to-date** Firestore security rules. Copy and paste these into **Firebase Console → Firestore Database → Rules**:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user role (robust version)
    function getUserRole() {
      // Check if user document exists and has role field
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc != null && userDoc.data != null && 'role' in userDoc.data
             ? userDoc.data.role
             : null;
    }
    
    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'admin';
    }
    
    function isTeacher() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'teacher';
    }
    
    function isStudent() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserRole() == 'student';
    }
    
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Users Collection
    // IMPORTANT: This must allow reads for authenticated users FIRST
    // so that getUserRole() can work in other rules
    match /users/{userId} {
      // Allow any authenticated user to read users (needed for role checks)
      // This MUST be first to allow getUserRole() to work
      allow read: if request.auth != null;
      
      // Users can update their own profile
      allow update: if request.auth != null && isOwner(userId);
      
      // Admins can update/delete any user (except themselves for delete)
      allow update, delete: if isAdmin() && request.auth.uid != userId;
      
      // Allow authenticated users to create (API routes check admin role server-side)
      allow create: if request.auth != null;
    }
    
    // Courses Collection
    match /courses/{courseId} {
      // Anyone can read published courses (even without auth)
      allow read: if resource.data.status == 'published';
      
      // Authenticated users can read published courses
      allow read: if request.auth != null && resource.data.status == 'published';
      
      // Teachers and admins can read ALL courses (including drafts)
      // This allows teachers to see all courses when querying the collection
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Teachers and admins can create courses
      allow create: if request.auth != null && (isTeacher() || isAdmin());
      
      // Course owner or admin can update/delete
      allow update, delete: if request.auth != null && (
        isOwner(resource.data.createdBy) || isAdmin()
      );
    }
    
    // Modules Collection
    match /modules/{moduleId} {
      // Teachers and admins can read all modules
      // This is permissive to allow collection queries
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read modules (we check course status in application code)
      allow read: if request.auth != null && isStudent();
      
      // Teachers and admins can create/update/delete modules
      allow create, update, delete: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Lessons Collection
    match /lessons/{lessonId} {
      // Teachers and admins can read all lessons
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read lessons (we check course status in application code)
      allow read: if request.auth != null && isStudent();
      
      // Teachers and admins can create/update/delete lessons
      allow create, update, delete: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Enrollments Collection (for course enrollments)
    match /enrollments/{enrollmentId} {
      // Students can read their own enrollments
      allow read: if request.auth != null && isOwner(resource.data.studentId);
      
      // Teachers and admins can read all enrollments
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can create their own enrollments
      allow create: if request.auth != null && isStudent() && isOwner(request.resource.data.studentId);
      
      // Only admins can delete enrollments
      allow delete: if isAdmin();
    }
    
    // Assessments Collection
    match /assessments/{assessmentId} {
      // Teachers and admins can read all assessments (published and draft)
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can only read published assessments
      allow read: if request.auth != null && isStudent() && resource.data.published == true;
      
      // Teachers and admins can create/update/delete assessments
      allow create, update, delete: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Assignments Collection
    match /assignments/{assignmentId} {
      // Teachers and admins can read all assignments (published and draft)
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read published and open assignments
      allow read: if request.auth != null && isStudent() && 
                  resource.data.status == 'published' && 
                  resource.data.isOpen == true;
      
      // Teachers and admins can create/update/delete assignments
      allow create, update, delete: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Submissions Collection
    match /submissions/{submissionId} {
      // Students can read their own submissions
      allow read: if request.auth != null && isOwner(resource.data.studentId);
      
      // Teachers and admins can read all submissions
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can create their own submissions
      allow create: if request.auth != null && isStudent() && isOwner(request.resource.data.studentId);
      
      // Teachers and admins can update submissions (for grading)
      allow update: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Settings Collection (for app-wide settings like logo)
    match /settings/{settingId} {
      // All authenticated users can read settings (for logo display)
      allow read: if request.auth != null;
      // Only admins can create/update settings
      allow create, update: if request.auth != null && isAdmin();
      // Only admins can delete settings
      allow delete: if request.auth != null && isAdmin();
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Quick Test Rules (If Above Doesn't Work)

If you're still getting permission errors, try these **temporary test rules** to verify your setup. **⚠️ These are permissive and should only be used for testing:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY TEST RULES - Very permissive for debugging
    // Replace with production rules above once everything works
    
    match /{document=**} {
      // Allow all reads/writes for authenticated users (FOR TESTING ONLY)
      allow read, write: if request.auth != null;
    }
  }
}
```

**Use these test rules to:**
1. Verify that authentication is working
2. Check if the issue is with the rules or with authentication
3. Once confirmed working, switch back to the production rules above

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mindcraft-f14ac`
3. Click **Firestore Database** → **Rules** tab
4. Copy and paste the rules above (start with test rules if needed)
5. Click **Publish**
6. Wait 30-60 seconds for rules to propagate

## Important Notes

### Two Separate Rule Systems

**Firestore Rules** (Database):
- Location: Firebase Console → **Firestore Database** → Rules
- Controls: Reading/writing documents in Firestore
- File: `docs/FIRESTORE_SECURITY_RULES.md` (this file)

**Storage Rules** (File Uploads):
- Location: Firebase Console → **Storage** → Rules  
- Controls: Uploading/downloading files to Firebase Storage
- File: `docs/FIREBASE_STORAGE_SETUP.md`

**These are completely separate!** Make sure you apply rules to the correct place.

### Users Collection Must Allow Reads First

The `users` collection rules **must** allow authenticated users to read first (line 58), because:
- Other rules call `getUserRole()` which reads from the `users` collection
- If users can't read their own document, `isTeacher()` and `isAdmin()` will fail
- This creates a circular dependency issue

### Database Name

- The rules use `{database}` variable which works with any database name
- Most projects use "(default)" as the database name
- The rules will work regardless of your database name

## Troubleshooting

### "Missing or insufficient permissions" for Modules/Courses

1. **Check if you applied Firestore rules (not Storage rules)**
   - Go to Firebase Console → **Firestore Database** → Rules (NOT Storage → Rules)
   - Make sure the rules are published

2. **Verify user document exists**
   - Go to Firestore Database → `users` collection
   - Find your user document (by your user ID from Firebase Auth)
   - Make sure it has a `role` field with value `'teacher'` or `'admin'`

3. **Try the test rules first**
   - Apply the "Quick Test Rules" above
   - If those work, the issue is with the role checking logic
   - If those don't work, the issue is with authentication

4. **Check browser console**
   - Look for specific error messages
   - Check if `request.auth.uid` is null (user not authenticated)

### "Missing or insufficient permissions" for User Profile

- The `users` collection must allow `allow read: if request.auth != null;` (line 58)
- This is needed so the sidebar can load the user profile
- Make sure this rule is present and published

### CORS Errors for File Uploads

- CORS errors are from **Firebase Storage**, not Firestore
- Apply Storage rules from `docs/FIREBASE_STORAGE_SETUP.md`
- Go to Firebase Console → **Storage** → Rules (NOT Firestore → Rules)

## Testing Checklist

After applying rules:
- [ ] Sign in as a teacher
- [ ] Check if you can see modules in Module Library
- [ ] Check if you can see courses in Manage Courses
- [ ] Check if profile picture loads in sidebar
- [ ] Try uploading a file (should work after Storage rules are applied)

## Related Documentation

- **Firebase Storage Rules**: See `docs/FIREBASE_STORAGE_SETUP.md`
- **Firebase Setup**: See `docs/FIREBASE_SETUP.md`
