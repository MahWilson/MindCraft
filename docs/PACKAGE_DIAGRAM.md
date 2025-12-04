# MindCraft Package Diagram - Subsystems/Modules

This document identifies all packages (subsystems/modules) in the MindCraft application, both currently implemented and planned for the final product. Each package is assigned a unique identifier (P001, P002, etc.) for reference in package diagrams and architectural documentation.

---

## Package List

### P001 - User Management & Authentication Subsystem
**Status:** ✅ Implemented  
**Description:** Handles user registration, authentication, profile management, and role-based access control (RBAC).

**Key Classes/Components:**
- `User` - User entity (uid, name, email, role, profilePic, class, status)
- `AuthService` - Authentication operations (login, logout, session management)
- `UserProfile` - User profile management
- `RBAC` - Role-based access control (admin, teacher, student)
- `UserRegistration` - User registration and account creation

**API Routes:**
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/session`
- `/api/users`
- `/api/users/[uid]`
- `/api/admin/register`

**Firestore Collections:**
- `user`

**Dependencies:**
- P002 (Course Management) - Users are associated with courses through enrollments
- P009 (Admin Management) - Admin operations on users

---

### P002 - Course Management Subsystem
**Status:** ✅ Implemented  
**Description:** Manages course creation, editing, publishing, module organization, and lesson content.

**Key Classes/Components:**
- `Course` - Course entity (title, description, status, modules, createdBy)
- `Module` - Course module entity (courseId, title, order, lessons)
- `Lesson` - Lesson entity (moduleId, title, contentHtml, materials)
- `CourseEnrollment` - Student enrollment in courses
- `CourseManager` - Course CRUD operations
- `ModuleManager` - Module organization and ordering
- `LessonEditor` - Lesson content creation and editing

**API Routes:**
- `/api/courses`
- `/api/courses/[id]`
- `/api/courses/[id]/modules`
- `/api/courses/[id]/enroll`
- `/api/modules`
- `/api/modules/[id]`
- `/api/lessons`
- `/api/lessons/[id]`

**Firestore Collections:**
- `course`
- `module`
- `lesson`
- `enrollment`

**Dependencies:**
- P001 (User Management) - Course creators and enrolled students
- P003 (Assessment Management) - Assessments are linked to courses
- P004 (Assignment Management) - Assignments are linked to courses
- P005 (Progress Tracking) - Progress is tracked per course
- P006 (Forum) - Forum discussions are course-specific
- P007 (AI Content Generation) - AI generates lesson content
- P008 (File Storage) - Lesson materials and course files
- P009 (Admin Management) - Course approval workflow

---

### P003 - Assessment Management Subsystem
**Status:** ✅ Partially Implemented  
**Description:** Handles assessment creation, question management, student attempts, and grading.

**Key Classes/Components:**
- `Assessment` - Assessment entity (courseId, title, type, questions, config, published)
- `Question` - Question entity (type, prompt, options, correctAnswer, points)
- `AssessmentSubmission` - Student submission entity (assessmentId, studentId, answers, grade, feedback)
- `AssessmentBuilder` - Assessment creation and editing
- `QuestionBuilder` - Question creation and management
- `AssessmentGrading` - Grading and feedback management

**API Routes:**
- `/api/assessments` (planned)
- `/api/assessments/[id]` (planned)
- `/api/submissions` (planned)

**Firestore Collections:**
- `assessment`
- `submission` (for assessments)

**Dependencies:**
- P001 (User Management) - Assessment creators and students
- P002 (Course Management) - Assessments belong to courses
- P005 (Progress Tracking) - Assessment results contribute to progress

---

### P004 - Assignment Management Subsystem
**Status:** ✅ Implemented  
**Description:** Manages assignment creation, student submissions, deadlines, and grading.

**Key Classes/Components:**
- `Assignment` - Assignment entity (courseId, title, description, deadline, status, allowLateSubmissions)
- `AssignmentSubmission` - Student submission entity (assignmentId, studentId, files, submittedAt, grade, feedback)
- `AssignmentManager` - Assignment CRUD operations
- `SubmissionManager` - Submission handling and grading

**API Routes:**
- `/api/assignments` (planned)
- `/api/assignments/[id]` (planned)

**Firestore Collections:**
- `assignment`
- `submission` (for assignments)

**Dependencies:**
- P001 (User Management) - Assignment creators and students
- P002 (Course Management) - Assignments belong to courses
- P005 (Progress Tracking) - Assignment grades contribute to progress
- P008 (File Storage) - Assignment file uploads

---

### P005 - Progress Tracking & Analytics Subsystem
**Status:** 🚧 Planned  
**Description:** Tracks student progress, completion metrics, and provides analytics dashboards.

**Key Classes/Components:**
- `Progress` - Progress entity (studentId, courseId, metrics)
- `ProgressTracker` - Progress calculation and tracking
- `AnalyticsDashboard` - Analytics visualization
- `CompletionMetrics` - Course/module/lesson completion tracking
- `PerformanceAnalytics` - Performance metrics and reports

**API Routes:**
- `/api/progress` (planned)
- `/api/analytics` (planned)

**Firestore Collections:**
- `progress`

**Dependencies:**
- P001 (User Management) - Student progress tracking
- P002 (Course Management) - Progress per course
- P003 (Assessment Management) - Assessment results in progress
- P004 (Assignment Management) - Assignment grades in progress

---

### P006 - Forum & Discussion Subsystem
**Status:** 🚧 Planned  
**Description:** Provides discussion forums for course-related topics, threads, and replies.

**Key Classes/Components:**
- `ForumTopic` - Forum topic entity (courseId, authorId, title, content, pinned, deleted)
- `ForumReply` - Reply entity (topicId, authorId, content, createdAt)
- `ForumManager` - Topic creation and management
- `ReplyManager` - Reply handling and threading

**API Routes:**
- `/api/forum` (planned)
- `/api/forum/[id]` (planned)

**Firestore Collections:**
- `forum`

**Dependencies:**
- P001 (User Management) - Forum authors and participants
- P002 (Course Management) - Forum topics are course-specific

---

### P007 - AI Content Generation Subsystem
**Status:** ✅ Partially Implemented (Stubbed)  
**Description:** Provides AI-assisted content generation for lessons, exercises, assessments, and learning assistance.

**Key Classes/Components:**
- `AIContentGenerator` - AI content generation service
- `LessonContentGenerator` - Lesson content scaffolding
- `ExerciseGenerator` - Exercise and practice question generation
- `AssessmentGenerator` - Assessment question generation
- `AILearningHelper` - Student AI chat and learning assistance (planned)
- `LearningRecommendations` - Personalized learning recommendations (planned)

**API Routes:**
- `/api/ai` - AI endpoint (currently stubbed)

**External Dependencies:**
- Gemini API / OpenAI API (planned)

**Dependencies:**
- P002 (Course Management) - Generates content for courses/lessons
- P003 (Assessment Management) - Generates assessment questions
- P004 (Assignment Management) - Generates assignment scaffolds

---

### P008 - File Storage Management Subsystem
**Status:** ✅ Implemented  
**Description:** Handles file uploads, storage, and retrieval for course materials, profile pictures, and submissions.

**Key Classes/Components:**
- `FileUploadService` - File upload handling
- `StorageManager` - Firebase Storage operations
- `MaterialManager` - Course material file management
- `ProfilePictureManager` - Profile picture upload and management
- `AppLogoManager` - Application logo management

**Storage Paths:**
- `profile-pictures/{userId}/`
- `course-materials/{courseId}/{moduleId}/{lessonId}/`
- `submissions/{submissionId}/`
- `app-logo/`

**Dependencies:**
- P001 (User Management) - Profile pictures
- P002 (Course Management) - Lesson materials
- P003 (Assessment Management) - Assessment file submissions
- P004 (Assignment Management) - Assignment file submissions

---

### P009 - Admin Management Subsystem
**Status:** ✅ Implemented  
**Description:** Provides administrative functions including user management, course approval, and system settings.

**Key Classes/Components:**
- `AdminUserManager` - User account management (create, edit, deactivate)
- `CourseApprovalManager` - Course approval and rejection workflow
- `SystemSettingsManager` - Application-wide settings management
- `AdminDashboard` - Administrative dashboard and overview

**API Routes:**
- `/api/admin/register`
- `/api/admin/courses/[id]/approve`
- `/api/admin/courses/[id]/reject`

**Firestore Collections:**
- `settings` (app-wide settings)

**Dependencies:**
- P001 (User Management) - Admin operations on users
- P002 (Course Management) - Course approval workflow
- P008 (File Storage) - App logo management

---

### P010 - Settings & Configuration Subsystem
**Status:** ✅ Partially Implemented  
**Description:** Manages user settings, profile configuration, and application preferences.

**Key Classes/Components:**
- `UserSettings` - User-specific settings and preferences
- `ProfileSettings` - Profile configuration (name, email, password, profile picture)
- `AppSettings` - Application-wide settings (admin only)
- `NotificationSettings` - Notification preferences (planned)
- `LanguageSettings` - Multilingual UI settings (planned)

**API Routes:**
- `/api/users/[uid]`
- `/api/users/[uid]/change-password`
- `/api/users/[uid]/profile-picture`

**Dependencies:**
- P001 (User Management) - User profile settings
- P008 (File Storage) - Profile picture management
- P009 (Admin Management) - App-wide settings

---

### P011 - Offline & Caching Subsystem
**Status:** 🚧 Planned  
**Description:** Provides offline support through Firestore persistence and local caching mechanisms.

**Key Classes/Components:**
- `OfflineManager` - Offline mode detection and management
- `CacheManager` - Local caching service
- `SyncManager` - Data synchronization when online
- `PersistenceManager` - Firestore offline persistence configuration

**Storage Mechanisms:**
- Firestore Offline Persistence (built-in)
- IndexedDB (planned for additional caching)
- LocalStorage (planned for lightweight data)

**Dependencies:**
- P002 (Course Management) - Offline lesson viewing
- P003 (Assessment Management) - Offline assessment queuing
- P004 (Assignment Management) - Offline submission queuing

---

### P012 - Dashboard & Navigation Subsystem
**Status:** ✅ Implemented  
**Description:** Provides role-based dashboards and navigation structure for different user types.

**Key Classes/Components:**
- `AdminDashboard` - Administrative dashboard
- `TeacherDashboard` - Teacher dashboard
- `StudentDashboard` - Student dashboard
- `Sidebar` - Navigation sidebar component
- `Header` - Application header component
- `NavigationManager` - Role-based navigation management

**Dependencies:**
- P001 (User Management) - Role-based navigation
- P002 (Course Management) - Course listings in dashboards
- P003 (Assessment Management) - Assessment listings
- P004 (Assignment Management) - Assignment listings
- P005 (Progress Tracking) - Progress display in dashboards

---

## Package Dependency Summary

### Core Dependencies (Most Dependent Packages):
- **P002 (Course Management)** - Depends on: P001, P003, P004, P005, P006, P007, P008, P009
- **P001 (User Management)** - Depends on: P002, P009

### Independent Packages:
- **P007 (AI Content Generation)** - Minimal dependencies, mainly external API
- **P008 (File Storage)** - Service layer, used by multiple packages

### Planned/Incomplete Packages:
- **P005 (Progress Tracking)** - Planned
- **P006 (Forum)** - Planned
- **P011 (Offline & Caching)** - Planned

---

## Implementation Status Legend

- ✅ **Implemented** - Fully functional in current codebase
- ✅ **Partially Implemented** - Core functionality exists, some features pending
- 🚧 **Planned** - Documented in vision/architecture, not yet implemented

---

## Notes for Package Diagram Creation

1. **Navigation Visibility**: Dependencies shown with dashed arrows indicate which packages depend on others
2. **Class Simplification**: For clarity, packages can show only class names without full attributes/methods
3. **Module Distribution**: Each package can be assigned to different team members for development
4. **Current vs. Planned**: Distinguish between implemented (✅) and planned (🚧) packages in the diagram

---

## Team Task Distribution Suggestion

Based on the 7 team members (1 Team Leader, 1 Scrum Master, 3 Developers, 2 Testers):

- **Developer 1**: P001 (User Management), P010 (Settings)
- **Developer 2**: P002 (Course Management), P012 (Dashboard)
- **Developer 3**: P003 (Assessment), P004 (Assignment)
- **Team Leader**: P009 (Admin Management), P007 (AI Integration)
- **Scrum Master**: P005 (Progress), P006 (Forum), P011 (Offline)
- **Testers**: Cross-package testing and integration testing

