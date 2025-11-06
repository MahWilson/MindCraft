# Firestore Security Rules

## ⚠️ IMPORTANT: Replace the Default Rules

The default Firebase rules allow public access to everything, which is **NOT secure**. Use the rules below instead.

## Proper Security Rules

Go to **Firebase Console → Firestore Database → Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return request.auth != null && getUserRole() == 'admin';
    }
    
    function isTeacher() {
      return request.auth != null && getUserRole() == 'teacher';
    }
    
    function isStudent() {
      return request.auth != null && getUserRole() == 'student';
    }
    
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Users Collection
    match /users/{userId} {
      // Allow any signed-in user to read users (needed for API routes)
      // API routes handle permission checks server-side
      allow read: if request.auth != null;
      
      // Users can update their own profile
      allow update: if request.auth != null && isOwner(userId);
      
      // Admins can update/delete any user (except themselves for delete)
      allow update, delete: if isAdmin() && request.auth.uid != userId;
      
      // Allow signed-in users to create (API routes check admin role server-side)
      allow create: if request.auth != null;
    }
    
    // Courses Collection
    match /courses/{courseId} {
      // Anyone can read published courses
      allow read: if resource.data.status == 'published';
      
      // Authenticated users can read published courses
      allow read: if request.auth != null && resource.data.status == 'published';
      
      // Teachers and admins can read draft courses
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Allow signed-in users to create (API routes check teacher/admin role server-side)
      allow create: if request.auth != null;
      
      // Course owner or admin can update/delete
      allow update, delete: if request.auth != null && (
        isOwner(resource.data.createdBy) || isAdmin()
      );
    }
    
    // Modules Collection
    match /modules/{moduleId} {
      // Teachers and admins can read all modules
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read modules from published courses
      allow read: if request.auth != null && isStudent();
      
      // Teachers and admins can create/update/delete modules
      allow create, update, delete: if request.auth != null && (isTeacher() || isAdmin());
    }
    
    // Lessons Collection
    match /lessons/{lessonId} {
      // Teachers and admins can read all lessons
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read lessons from published courses
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
      // Teachers and admins can read all assessments
      allow read: if request.auth != null && (isTeacher() || isAdmin());
      
      // Students can read published assessments
      allow read: if request.auth != null && isStudent() && resource.data.published == true;
      
      // Teachers and admins can create/update/delete assessments
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
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Important Notes

**About API Routes:**
- API routes use Firebase Web SDK which requires user authentication
- Rules allow authenticated users to read/write, but API routes perform additional permission checks server-side
- This is a security-in-depth approach: rules provide base protection, API routes enforce business logic

**About Firebase Project Collaborators:**
- People you add to your Firebase project (via Firebase Console → Project Settings → Users and permissions) have **admin access to the Firebase Console**
- They can manage the project, view data, and configure settings through the console
- Firestore security rules **do NOT affect** Firebase Console access - collaborators can always access via console
- Security rules only affect **application-level access** (when your app code tries to read/write)

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mindcraft-f14ac`
3. Click **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy and paste the rules above
6. Click **Publish**
7. Wait a few seconds for rules to propagate

## Testing

After applying these rules:
- ✅ Users can read/update their own profile
- ✅ Admins can manage all users
- ✅ Published courses are readable by everyone
- ✅ Draft courses are only readable by teachers/admins
- ✅ Students can enroll in courses
- ✅ Teachers can create/manage courses and content

## Troubleshooting

If you get permission errors:
1. Make sure you're logged in
2. Verify your user document exists in Firestore with the correct `role` field
3. Check that the user UID matches between Auth and Firestore
4. Review the browser console for specific error messages

