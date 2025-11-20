# UI Scaffolding Plan - Feature Placement

This document outlines where each user story feature should be implemented in the UI for demonstration purposes.

---

## Feature Mapping by User Story

### 1. **US011-02: Generate Learning Material using AI** ✅ (Partially Done)
**Status:** Already scaffolded in `AILearningHelper.jsx`

**Location:**
- **Teacher/Admin View:** 
  - `app/dashboard/modules/[id]/page.jsx` (Lesson Editor)
  - Already integrated in "Add Lesson" and "Edit Lesson" sections
  - Component: `app/components/AILearningHelper.jsx`

**Enhancement Needed:**
- Expand UI to show more AI generation options (templates, styles, difficulty levels)
- Add preview of generated content before applying

---

### 2. **US004-01: Upload Lesson Material**
**Status:** New Feature

**Location:**
- **Teacher/Admin View:**
  - `app/dashboard/modules/[id]/page.jsx` (Lesson Editor)
  - Add a "Materials" section in the lesson editor (both add and edit modes)
  - Allow upload of: `.docx`, `.pdf`, `.pptx`, images, videos
  - Show uploaded files list with download/delete options

**UI Components Needed:**
- File upload component with drag-and-drop
- File list display with icons for file types
- Upload progress indicator

**New Section in Lesson Editor:**
```jsx
{/* Materials Section */}
<div className="space-y-2">
  <h4 className="text-body font-medium">Lesson Materials</h4>
  <FileUploadComponent 
    accept=".pdf,.docx,.pptx,.jpg,.png,.mp4"
    onUpload={handleFileUpload}
  />
  <MaterialsList materials={lesson.materials} />
</div>
```

---

### 3. **US005-02: Download Learning Resource**
**Status:** New Feature

**Location:**
- **Student View:**
  - `app/courses/[id]/modules/[moduleId]/lessons/[lessonId]/page.jsx` (Lesson Detail Page)
  - Add a "Resources" or "Materials" section below lesson content
  - Display downloadable files with download buttons

**UI Components Needed:**
- Resource card/list component
- Download button with file type icons
- File size display

**New Section in Lesson Detail:**
```jsx
{/* Learning Resources */}
{lesson.materials && lesson.materials.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Learning Resources</CardTitle>
    </CardHeader>
    <CardContent>
      <ResourcesList materials={lesson.materials} />
    </CardContent>
  </Card>
)}
```

---

### 4. **US005-01: Browse Course Material**
**Status:** Already Exists ✅

**Location:**
- **Student View:**
  - `app/courses/[id]/page.jsx` (Course Detail Page)
  - Already shows modules and lessons in structured format
  - **Enhancement:** Add search/filter functionality within course materials

**Enhancement Needed:**
- Add search bar to filter modules/lessons
- Add progress indicators for completed lessons
- Add "Recently Viewed" section

---

### 5. **US006-01: Create Assessment**
**Status:** New Feature

**Location:**
- **Teacher/Admin View:**
  - **Option 1:** New dedicated page: `app/assessments/new/page.jsx`
  - **Option 2:** Within course edit page: `app/dashboard/courses/[id]/edit/page.jsx`
  - **Recommended:** Create new page with course selection dropdown

**New Page Structure:**
```
app/assessments/
  ├── new/
  │   └── page.jsx          (Create Assessment Form)
  ├── [id]/
  │   ├── page.jsx           (Assessment Detail/Preview)
  │   └── edit/
  │       └── page.jsx       (Edit Assessment)
  └── page.jsx               (Assessments List - Teacher/Admin)
```

**UI Components Needed:**
- Assessment form (title, description, type: quiz/coding/assignment)
- Question builder (for quiz type)
- Configuration panel (start date, end date, timer, attempts)
- Course selection dropdown

---

### 6. **US006-02: Configure Assessment**
**Status:** New Feature

**Location:**
- **Teacher/Admin View:**
  - `app/assessments/[id]/edit/page.jsx` (Assessment Edit Page)
  - Similar to create page but pre-filled with existing data
  - Allow editing all assessment properties

**UI Components Needed:**
- Same as Create Assessment
- Add "Delete Assessment" button in this page
- Add "Preview Assessment" button (student view)

---

### 7. **Delete Assessment** (Part of US006-02)
**Status:** New Feature

**Location:**
- **Teacher/Admin View:**
  - `app/assessments/[id]/edit/page.jsx` (Delete button in edit page)
  - `app/assessments/page.jsx` (Delete button in list view)
  - Confirmation dialog before deletion

**UI Components Needed:**
- Delete button with confirmation modal
- Success/error toast notifications

---

### 8. **US007-01: Start Assessment** (Student View)
**Status:** New Feature

**Location:**
- **Student View:**
  - `app/assessments/[id]/take/page.jsx` (Assessment Taking Page)
  - Accessible from: `app/assessments/page.jsx` (Student Assessments List)

**New Page Structure:**
```
app/assessments/
  ├── [id]/
  │   └── take/
  │       └── page.jsx       (Take Assessment - Student)
```

**UI Components Needed:**
- Question display component
- Answer input (text, multiple choice, code editor)
- Timer display
- Submit button
- Progress indicator

---

### 9. **Post New Discussion Topic**
**Status:** New Feature

**Location:**
- **All Users (Students, Teachers, Admins):**
  - `app/forum/page.jsx` (Main Forum Page - List of topics)
  - `app/forum/new/page.jsx` (Create New Topic Page)
  - `app/courses/[id]/discussions/page.jsx` (Course-specific discussions - Optional)

**New Page Structure:**
```
app/forum/
  ├── new/
  │   └── page.jsx           (Create Discussion Topic)
  ├── [id]/
  │   └── page.jsx           (Discussion Topic Detail with Replies)
  └── page.jsx               (Forum List - All Topics)
```

**UI Components Needed:**
- Topic creation form (title, content, course selection)
- Rich text editor for content
- Topic list with sorting/filtering
- Reply component
- Pin/unpin functionality (for teachers/admins)

---

## Summary: New Pages to Create

### For Teachers/Admins:
1. ✅ `app/dashboard/modules/[id]/page.jsx` - **Enhance** with file upload section
2. 🆕 `app/assessments/new/page.jsx` - Create Assessment
3. 🆕 `app/assessments/[id]/edit/page.jsx` - Configure/Edit Assessment
4. 🆕 `app/assessments/page.jsx` - Assessments List (Teacher/Admin view)

### For Students:
1. ✅ `app/courses/[id]/modules/[moduleId]/lessons/[lessonId]/page.jsx` - **Enhance** with download resources section
2. 🆕 `app/assessments/page.jsx` - Assessments List (Student view - available assessments)
3. 🆕 `app/assessments/[id]/take/page.jsx` - Take Assessment
4. 🆕 `app/forum/page.jsx` - Forum (Browse topics)
5. 🆕 `app/forum/new/page.jsx` - Create Discussion Topic
6. 🆕 `app/forum/[id]/page.jsx` - Discussion Topic Detail

---

## Implementation Priority (For Today's Demo)

### Phase 1: Quick Wins (UI Only)
1. ✅ **Generate Learning Material** - Already done, just enhance UI
2. 🆕 **Upload Lesson Material** - Add file upload section to lesson editor
3. 🆕 **Download Learning Resources** - Add resources section to lesson detail page
4. 🆕 **Browse Course Material** - Already exists, just verify it works

### Phase 2: Assessment Features (UI Only)
5. 🆕 **Create Assessment** - New page with form
6. 🆕 **Configure Assessment** - Edit page
7. 🆕 **Delete Assessment** - Button in edit/list pages
8. 🆕 **Start Assessment** - Student view (placeholder UI)

### Phase 3: Forum Features (UI Only)
9. 🆕 **Post Discussion Topic** - New topic form
10. 🆕 **Forum List** - Browse topics page

---

## File Structure Overview

```
app/
├── assessments/                    # NEW
│   ├── new/
│   │   └── page.jsx                # Create Assessment
│   ├── [id]/
│   │   ├── page.jsx                # Assessment Detail/Preview
│   │   ├── edit/
│   │   │   └── page.jsx            # Edit Assessment
│   │   └── take/
│   │       └── page.jsx            # Take Assessment (Student)
│   └── page.jsx                    # Assessments List
│
├── forum/                          # NEW
│   ├── new/
│   │   └── page.jsx                # Create Discussion Topic
│   ├── [id]/
│   │   └── page.jsx                # Discussion Detail
│   └── page.jsx                    # Forum List
│
├── courses/
│   └── [id]/
│       └── modules/
│           └── [moduleId]/
│               └── lessons/
│                   └── [lessonId]/
│                       └── page.jsx    # ENHANCE: Add resources section
│
└── dashboard/
    └── modules/
        └── [id]/
            └── page.jsx                # ENHANCE: Add file upload section
```

---

## Component Library Needed

### New Reusable Components:
1. **FileUploadComponent** - Drag-and-drop file uploader
2. **MaterialsList** - Display list of uploaded materials with actions
3. **ResourceCard** - Display downloadable resource with icon
4. **AssessmentForm** - Create/edit assessment form
5. **QuestionBuilder** - Build quiz questions
6. **DiscussionCard** - Display forum topic card
7. **ReplyThread** - Display discussion replies

---

## Navigation Updates

### Sidebar Navigation (app/layout.jsx):

**For Teachers/Admins:**
- ✅ Assessments (already in nav) → Link to `/assessments`
- 🆕 Add "Create Assessment" quick link (optional)

**For Students:**
- ✅ Assessments (already in nav) → Link to `/assessments`
- ✅ Forum (already in nav) → Link to `/forum`

---

## Notes for Implementation

1. **All features are UI-only for now** - No backend integration needed
2. **Use placeholder data** - Mock data is fine for demonstration
3. **Focus on visual structure** - Make it look functional even if not connected
4. **Consistent styling** - Use existing UI components (Card, Button, Input, etc.)
5. **Responsive design** - Ensure mobile-friendly layouts

---

## Quick Reference: Feature → Page Mapping

| Feature | User Type | Page Location | Status |
|---------|-----------|---------------|--------|
| Generate Learning Material | Teacher/Admin | `dashboard/modules/[id]/page.jsx` | ✅ Done |
| Upload Lesson Material | Teacher/Admin | `dashboard/modules/[id]/page.jsx` | 🆕 To Do |
| Download Resources | Student | `courses/[id]/modules/[moduleId]/lessons/[lessonId]/page.jsx` | 🆕 To Do |
| Browse Course Material | Student | `courses/[id]/page.jsx` | ✅ Exists |
| Create Assessment | Teacher/Admin | `assessments/new/page.jsx` | 🆕 To Do |
| Configure Assessment | Teacher/Admin | `assessments/[id]/edit/page.jsx` | 🆕 To Do |
| Delete Assessment | Teacher/Admin | `assessments/[id]/edit/page.jsx` | 🆕 To Do |
| Start Assessment | Student | `assessments/[id]/take/page.jsx` | 🆕 To Do |
| Post Discussion Topic | All | `forum/new/page.jsx` | 🆕 To Do |
| Browse Forum | All | `forum/page.jsx` | 🆕 To Do |

