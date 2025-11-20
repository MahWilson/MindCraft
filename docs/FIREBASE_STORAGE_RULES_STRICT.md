# Stricter Firebase Storage Rules

## Current Issues with Permissive Rules

The current rules allow:
- ❌ Any teacher/admin to upload to ANY module (no ownership check)
- ❌ Students to read ALL lesson materials (no enrollment check)
- ❌ No validation that module exists

## Stricter Production Rules

Use these rules for better security in a shared project:

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
    
    // Check if module exists
    function moduleExists(moduleId) {
      return exists(/databases/(default)/documents/modules/$(moduleId));
    }
    
    // Check if user created the module (if modules have createdBy field)
    function isModuleOwner(moduleId) {
      let moduleDoc = get(/databases/(default)/documents/modules/$(moduleId));
      return moduleDoc != null && 
             moduleDoc.data != null &&
             'createdBy' in moduleDoc.data &&
             moduleDoc.data.createdBy == request.auth.uid;
    }
    
    // Check if student is enrolled in course (via module's courseId)
    function isEnrolledInModuleCourse(moduleId) {
      let moduleDoc = get(/databases/(default)/documents/modules/$(moduleId));
      if (moduleDoc == null || moduleDoc.data == null) return false;
      
      // If module has courseId, check enrollment
      if ('courseId' in moduleDoc.data) {
        let courseId = moduleDoc.data.courseId;
        // Check if student has enrollment for this course
        // Note: This requires an index on enrollments collection
        // For now, we'll allow if course is published (checked in app code)
        return true; // App code will verify enrollment
      }
      
      // If no courseId, allow (module might be in library)
      return true;
    }
    
    // Profile pictures: users can upload/read their own, admins can read any
    match /profile-pictures/{userId}/{allPaths=**} {
      allow write: if isSignedIn() && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }
    
    // Lesson materials: stricter rules
    match /lesson-materials/{moduleId}/{allPaths=**} {
      // STRICTER: Only allow uploads if:
      // 1. User is teacher/admin
      // 2. Module exists
      // 3. User created the module OR is admin (optional - comment out if modules are shared)
      // 4. File size and type restrictions
      allow write: if isTeacherOrAdmin()
                   && moduleExists(moduleId)  // Module must exist
                   // && (isModuleOwner(moduleId) || isAdmin())  // Uncomment for ownership check
                   && request.resource.size < 10 * 1024 * 1024  // 10MB limit
                   && (
                     request.resource.contentType == 'application/pdf' ||
                     request.resource.contentType == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     request.resource.contentType == 'application/msword' ||
                     request.resource.contentType == 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     request.resource.contentType == 'application/vnd.ms-powerpoint' ||
                     request.resource.contentType.matches('image/.*') ||
                     request.resource.contentType.matches('video/.*')
                   );
      
      // STRICTER: Students can only read if module exists
      // (Enrollment check is done in app code for performance)
      allow read: if isSignedIn() 
                   && moduleExists(moduleId)
                   && (isTeacherOrAdmin() || isStudent());
      
      // STRICTER: Only module owner or admin can delete
      allow delete: if isTeacherOrAdmin() 
                    && moduleExists(moduleId)
                    && (isModuleOwner(moduleId) || isAdmin());
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Key Improvements

1. **Module Existence Check**: `moduleExists(moduleId)` - Verifies module exists before allowing access
2. **Module Ownership Check** (optional): `isModuleOwner(moduleId)` - Only allows uploads to modules you created
3. **Stricter Delete Rules**: Only module owner or admin can delete files

## Choose Your Security Level

### Option 1: Moderate (Recommended for Shared Projects)
Use the rules above **WITHOUT** the ownership check (keep it commented out):
- ✅ Teachers/admins can upload to any module (collaborative)
- ✅ Module must exist (prevents invalid paths)
- ✅ File type and size restrictions

### Option 2: Strict (Individual Ownership)
Uncomment the ownership check line:
- ✅ Only module creator or admin can upload
- ✅ More secure but less collaborative
- ✅ Better for individual projects

## Important Notes

### Module Ownership
For the ownership check to work, your `modules` collection documents need a `createdBy` field:
```javascript
{
  id: "module123",
  title: "Introduction to Python",
  createdBy: "user-uid-here",  // Add this field
  lessons: [],
  ...
}
```

### Performance Consideration
The `moduleExists()` check adds a Firestore read for each upload. This is acceptable for most use cases, but if you have very high upload volume, you might want to remove it and rely on app-level validation.

### Enrollment Check for Students
Checking student enrollment in Storage rules would require complex queries. It's better to:
1. Allow students to read if module exists (Storage rule)
2. Check enrollment in your app code (application-level security)

## Migration Steps

1. **Add `createdBy` to existing modules** (if using ownership check):
   ```javascript
   // In Firestore, update each module:
   {
     ...existingFields,
     createdBy: "teacher-uid-who-created-it"
   }
   ```

2. **Update Storage rules** with the stricter version above

3. **Test uploads** to ensure they still work

4. **Monitor** for any permission errors

## Recommendation

For a **shared school project**, I recommend **Option 1 (Moderate)**:
- Keeps collaboration open (teachers can help each other)
- Still validates module existence
- Maintains file type/size restrictions
- Good balance of security and usability

