# Collaborative Firebase Storage Rules with Enrollment Checks

## Features

✅ **Module Ownership with Collaboration**
- Modules have an owner (`createdBy`)
- Other teachers can be added as collaborators (`collaborators` array)
- Collaborators can upload materials

✅ **Uploader-Based Delete Permissions**
- Only the person who uploaded a file can delete it
- Module owner and admins can also delete any file
- Collaborators can only delete their own uploads

✅ **Enrollment-Based Student Access**
- Students must be enrolled in the course to view lesson materials
- Students can view module overview/preview without enrollment (handled in app code)

## Required Data Structure

### Modules Collection
Your modules need these fields:
```javascript
{
  id: "module123",
  title: "Introduction to Python",
  createdBy: "teacher-uid-here",  // Module owner
  collaborators: ["teacher-uid-2", "teacher-uid-3"],  // Optional: array of teacher UIDs
  lessons: [],
  ...
}
```

### Materials in Lessons
Materials should include `uploadedBy`:
```javascript
{
  id: "file123",
  name: "lesson.pdf",
  url: "https://...",
  uploadedBy: "teacher-uid-here",  // Who uploaded this file
  ...
}
```

### Enrollments Collection
Enrollments are stored as: `enrollments/{studentId}_{courseId}`

## Storage Rules

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
    
    // Get module document
    function getModule(moduleId) {
      return get(/databases/(default)/documents/modules/$(moduleId));
    }
    
    // Check if user is module owner
    function isModuleOwner(moduleId) {
      let moduleDoc = getModule(moduleId);
      return moduleDoc != null && 
             moduleDoc.data != null &&
             'createdBy' in moduleDoc.data &&
             moduleDoc.data.createdBy == request.auth.uid;
    }
    
    // Check if user is module collaborator
    function isModuleCollaborator(moduleId) {
      let moduleDoc = getModule(moduleId);
      if (moduleDoc == null || moduleDoc.data == null) return false;
      
      // Check if user is in collaborators array
      if ('collaborators' in moduleDoc.data && 
          moduleDoc.data.collaborators is list) {
        return request.auth.uid in moduleDoc.data.collaborators;
      }
      return false;
    }
    
    // Check if user can upload to module (owner, collaborator, or admin)
    function canUploadToModule(moduleId) {
      return isModuleOwner(moduleId) || 
             isModuleCollaborator(moduleId) || 
             isAdmin();
    }
    
    // Get course ID from module (modules might have courseId field)
    function getModuleCourseId(moduleId) {
      let moduleDoc = getModule(moduleId);
      if (moduleDoc == null || moduleDoc.data == null) return null;
      
      if ('courseId' in moduleDoc.data) {
        return moduleDoc.data.courseId;
      }
      
      // If no courseId in module, try to find it via courses collection
      // This is complex, so we'll rely on app-level checks for now
      return null;
    }
    
    // Check if student is enrolled in course
    function isEnrolledInCourse(courseId) {
      if (!isStudent() || courseId == null) return false;
      
      // Enrollment document ID format: {studentId}_{courseId}
      let enrollmentId = request.auth.uid + '_' + courseId;
      return exists(/databases/(default)/documents/enrollments/$(enrollmentId));
    }
    
    // Check if student can access module materials
    // Students must be enrolled in the course that contains this module
    function canStudentAccessModuleMaterials(moduleId) {
      if (!isStudent()) return false;
      
      let moduleDoc = getModule(moduleId);
      if (moduleDoc == null || moduleDoc.data == null) return false;
      
      // If module has courseId, check enrollment
      if ('courseId' in moduleDoc.data) {
        let courseId = moduleDoc.data.courseId;
        return isEnrolledInCourse(courseId);
      }
      
      // If no courseId, deny access (orphaned module or module library)
      // Module library modules shouldn't have materials accessible to students
      return false;
    }
    
    // Profile pictures: users can upload/read their own, admins can read any
    match /profile-pictures/{userId}/{allPaths=**} {
      allow write: if isSignedIn() && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }
    
    // Lesson materials: collaborative with enrollment checks
    match /lesson-materials/{moduleId}/{allPaths=**} {
      // UPLOAD: Module owner, collaborators, or admin can upload
      allow write: if isTeacherOrAdmin()
                   && moduleExists(moduleId)
                   && canUploadToModule(moduleId)  // Owner, collaborator, or admin
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
      
      // READ: Teachers/admins can read all, students only if enrolled
      allow read: if isSignedIn() 
                   && moduleExists(moduleId)
                   && (
                     isTeacherOrAdmin() ||  // Teachers/admins can read all
                     canStudentAccessModuleMaterials(moduleId)  // Students must be enrolled
                   );
      
      // DELETE: Module owner or admin can delete
      // Note: Uploader-based delete is handled in application code
      // (Storage rules can't check uploadedBy from file path)
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

## Important Notes

### Uploader-Based Delete Limitation

Storage rules **cannot** check who uploaded a file from the Storage path alone. The application code handles this:
- Storage rule allows module owner/admin to delete (as fallback)
- Application code checks `uploadedBy` field before allowing delete
- This provides both security layers

### Enrollment Check Complexity

The enrollment check requires:
1. Get module → get courseId
2. Check if enrollment document exists: `enrollments/{studentId}_{courseId}`

This adds 2 Firestore reads per access, which is acceptable for most use cases.

### Module Collaboration

To add collaborators to a module:
```javascript
// In Firestore, update module:
{
  ...existingFields,
  createdBy: "owner-teacher-uid",
  collaborators: ["teacher-uid-2", "teacher-uid-3"]  // Array of teacher UIDs
}
```

### Student Preview Access

For students to view module overview/preview without enrollment:
- This is handled in **application code** (not Storage rules)
- Storage rules only control file access
- App code can show module title/description but hide materials until enrolled

## Migration Steps

1. **Add `createdBy` to existing modules:**
   ```javascript
   // Update each module in Firestore:
   {
     ...existingFields,
     createdBy: "teacher-uid-who-created-it",
     collaborators: []  // Empty array, add collaborators later
   }
   ```

2. **Add `uploadedBy` to existing materials** (optional):
   - Update lesson documents to include `uploadedBy` in materials array
   - Or start tracking from now on (new uploads will have it)

3. **Update Storage rules** with the rules above

4. **Test** uploads, reads, and deletes

## Testing Checklist

- [ ] Module owner can upload ✅
- [ ] Module collaborator can upload ✅
- [ ] Non-collaborator teacher cannot upload ❌
- [ ] Enrolled student can read materials ✅
- [ ] Non-enrolled student cannot read materials ❌
- [ ] Uploader can delete their own files (app code) ✅
- [ ] Module owner can delete any file ✅
- [ ] Admin can delete any file ✅

## Complexity Assessment

**Moderate Complexity:**
- ✅ Module existence check (1 Firestore read)
- ✅ Module ownership check (1 Firestore read)
- ✅ Collaborator check (1 Firestore read)
- ✅ Enrollment check (2 Firestore reads: module + enrollment)
- ⚠️ Total: 3-4 Firestore reads per upload/access

**Performance:** Acceptable for most use cases. If you have very high traffic, consider caching or simplifying.
