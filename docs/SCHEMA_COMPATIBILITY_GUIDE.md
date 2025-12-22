# Database Schema Compatibility Guide

## Problem

Your local codebase has schema changes that don't match the GitHub version, causing views to break when the database has mixed old/new schema data.

## Solution: Backward-Compatible Code

Add compatibility layers to handle both old and new schema versions.

### 1. Enrollment Schema Compatibility

**Old Schema (GitHub version):**
```javascript
{
  studentId: "user123",
  courseId: "course456",
  enrolledAt: timestamp,
  completedModules: ["module1"],
  completedLessons: ["lesson1", "lesson2"],
  overallProgress: 50
}
```

**New Schema (Your local version):**
```javascript
{
  studentId: "user123",
  courseId: "course456",
  enrolledAt: timestamp,
  progress: {
    completedModules: ["module1"],
    completedLessons: ["lesson1", "lesson2"],
    overallProgress: 50
  }
}
```

**Compatibility Helper:**
```javascript
// Add this to files that read enrollments
function normalizeEnrollment(enrollmentData) {
  if (!enrollmentData) return null;
  
  // If old schema (flat structure)
  if (enrollmentData.completedLessons && !enrollmentData.progress) {
    return {
      ...enrollmentData,
      progress: {
        completedModules: enrollmentData.completedModules || [],
        completedLessons: enrollmentData.completedLessons || [],
        overallProgress: enrollmentData.overallProgress || 0
      }
    };
  }
  
  // If new schema (nested progress) or already normalized
  return {
    ...enrollmentData,
    progress: enrollmentData.progress || {
      completedModules: [],
      completedLessons: [],
      overallProgress: 0
    }
  };
}

// Usage:
const enrollmentDoc = await getDoc(enrollmentRef);
const enrollment = normalizeEnrollment(enrollmentDoc.data());
const progress = enrollment.progress.overallProgress; // Always works
```

### 2. Lesson Schema Compatibility

**Old Schema:**
```javascript
{
  title: "Lesson 1",
  content: "HTML content here",
  moduleId: "module123"
}
```

**New Schema:**
```javascript
{
  title: "Lesson 1",
  contentHtml: "HTML content here", // New field name
  content: "HTML content here", // Kept for compatibility
  moduleId: "module123"
}
```

**Compatibility Helper:**
```javascript
function getLessonContent(lessonData) {
  if (!lessonData) return '';
  
  // Prefer contentHtml (new), fallback to content (old)
  return lessonData.contentHtml || lessonData.content || '';
}

// Usage:
const lessonDoc = await getDoc(lessonRef);
const content = getLessonContent(lessonDoc.data());
```

### 3. Course Schema Compatibility

**Check for missing fields:**
```javascript
function normalizeCourse(courseData) {
  if (!courseData) return null;
  
  return {
    ...courseData,
    status: courseData.status || 'draft',
    modules: courseData.modules || [],
    createdAt: courseData.createdAt || null,
    updatedAt: courseData.updatedAt || null
  };
}
```

## Files to Update

Add compatibility helpers to these files:

1. **`app/courses/[id]/page.jsx`** - Course detail page
2. **`app/courses/page.jsx`** - My courses page
3. **`app/api/ai/recommendations/route.js`** - Recommendations API
4. **`app/components/LearningRecommendations.jsx`** - Recommendations component
5. **Any file that reads enrollment data**

## Migration Script (Optional)

If you want to migrate old data to new schema:

```javascript
// scripts/migrate-enrollment-schema.js
async function migrateEnrollments() {
  const enrollmentsSnapshot = await getDocs(collection(db, 'enrollment'));
  
  const batch = writeBatch(db);
  let count = 0;
  
  enrollmentsSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // If old schema, migrate to new
    if (data.completedLessons && !data.progress) {
      batch.update(doc.ref, {
        progress: {
          completedModules: data.completedModules || [],
          completedLessons: data.completedLessons || [],
          overallProgress: data.overallProgress || 0
        }
      });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Migrated ${count} enrollment documents`);
  }
}
```

## Testing

After adding compatibility code:

1. Test with old schema data
2. Test with new schema data
3. Test with mixed data
4. Verify views render correctly

## Best Practice

**Always write backward-compatible code** when schema changes:
- Check for both old and new field names
- Provide sensible defaults
- Don't break existing functionality
- Document schema changes

