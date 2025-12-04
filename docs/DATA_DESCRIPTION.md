# Data Description

## Overview

The information domain of the MindCraft system is transformed into data structures using a NoSQL document-based database architecture. The system employs Firebase Firestore as its primary database, which stores data as collections of documents (similar to tables and rows in relational databases, but with a flexible schema).

## Database Architecture

The major data or system entities are stored in a database named **Firebase Firestore** (project: `mindcraft-f14ac`), processed and organized into **11 entities** (collections) as listed in Table 4.1.

### Data Storage Approach

1. **Document-Based Storage**: Each entity is stored as a collection of documents in Firestore, where each document represents an instance of that entity (e.g., a single user, course, or assignment).

2. **Flexible Schema**: Unlike traditional relational databases, Firestore allows documents within the same collection to have slightly different structures, providing flexibility for evolving data requirements.

3. **Hierarchical Organization**: Related data is organized hierarchically:
   - Courses contain Modules
   - Modules contain Lessons
   - Courses have associated Assessments and Assignments
   - Students create Submissions for Assessments and Assignments

4. **Reference Relationships**: Relationships between entities are maintained through:
   - **Document IDs**: Direct references using document IDs (e.g., `courseId`, `moduleId`, `studentId`)
   - **Arrays**: Lists of related document IDs (e.g., `modules: [moduleId1, moduleId2]`)
   - **Nested Objects**: Complex data structures stored within documents (e.g., `questions` array in Assessment)

5. **Timestamp Management**: System-generated timestamps (`createdAt`, `updatedAt`, `submittedAt`) are automatically managed using Firestore's `serverTimestamp()` function to ensure consistency.

6. **File Storage Integration**: Binary files (materials, profile pictures, submissions) are stored in Firebase Storage with URLs referenced in Firestore documents, maintaining separation between structured data and file storage.

### Data Processing

- **Real-time Updates**: Firestore provides real-time listeners that automatically update the application when data changes.
- **Offline Support**: Firestore's offline persistence enables the application to function without internet connectivity, syncing changes when connection is restored.
- **Query Capabilities**: Complex queries support filtering, sorting, and pagination across collections.
- **Security Rules**: Access control is enforced at the database level through Firestore Security Rules, ensuring users can only access data they are authorized to view or modify.

---

## Table 4.1: System Entities

| No. | Entity Name | Description |
|-----|-------------|-------------|
| 1 | **User** | Stores user account information including authentication details, profile data, role (admin/teacher/student), and account status. Each user document is identified by their Firebase Authentication UID. |
| 2 | **Course** | Represents a learning course created by teachers or admins. Contains course metadata (title, description), publication status (draft/published), creator information, timestamps, and references to associated modules. |
| 3 | **Module** | Represents a course module that groups related lessons together. Contains module title, ordering information within the course, and references to lessons. Modules are organized hierarchically under courses. |
| 4 | **Lesson** | Represents individual lesson content within a module. Contains lesson title, HTML-formatted content, references to uploaded materials (files), AI generation flag, and update timestamps. Lessons are the fundamental learning units in the system. |
| 5 | **Enrollment** | Tracks student enrollments in courses. Links students to courses they have enrolled in, enabling access control and progress tracking. Contains enrollment date and status information. |
| 6 | **Assessment** | Represents quizzes, tests, or coding assessments associated with courses. Contains assessment title, description, type (quiz/coding/assignment), questions array with options and correct answers, configuration settings (start/end dates, timer, attempts), and publication status. |
| 7 | **Assignment** | Represents assignments that students must complete and submit. Contains assignment title, description, associated course, deadline, status (draft/published), open/closed state, and late submission policy. Assignments are distinct from assessments as they require file submissions. |
| 8 | **Submission** | Stores student submissions for both assessments and assignments. Contains submission metadata (assessment/assignment ID, student ID), submitted answers (for assessments), uploaded files (for assignments), grading information (grade, feedback, status), and submission timestamp. |
| 9 | **Progress** | Tracks student learning progress and completion metrics. Contains student ID, course ID, and aggregated metrics such as lesson completion, assessment scores, assignment grades, and overall course progress. Used for analytics and progress dashboards. |
| 10 | **Forum** | Stores discussion forum topics and replies for course-related discussions. Contains topic information (course ID, author, title, content), reply threads, pinned status for important topics, and deletion flags. Enables collaborative learning through peer discussions. |
| 11 | **Setting** | Stores application-wide configuration settings. Currently used for managing the application logo URL and other system-level settings. Only accessible and modifiable by administrators. |

---

## Entity Relationships

### Primary Relationships:

1. **User → Course**: One-to-Many (users create multiple courses)
2. **Course → Module**: One-to-Many (courses contain multiple modules)
3. **Module → Lesson**: One-to-Many (modules contain multiple lessons)
4. **Course → Assessment**: One-to-Many (courses have multiple assessments)
5. **Course → Assignment**: One-to-Many (courses have multiple assignments)
6. **User → Enrollment**: One-to-Many (users enroll in multiple courses)
7. **Course → Enrollment**: One-to-Many (courses have multiple enrollments)
8. **Assessment → Submission**: One-to-Many (assessments receive multiple submissions)
9. **Assignment → Submission**: One-to-Many (assignments receive multiple submissions)
10. **User → Submission**: One-to-Many (users create multiple submissions)
11. **User → Progress**: One-to-Many (users have progress records for multiple courses)
12. **Course → Forum**: One-to-Many (courses have multiple forum topics)

### Data Flow:

- **Content Creation Flow**: User (Teacher/Admin) → Course → Module → Lesson
- **Learning Flow**: User (Student) → Enrollment → Course → Module → Lesson
- **Assessment Flow**: User (Student) → Assessment → Submission → Grading
- **Assignment Flow**: User (Student) → Assignment → Submission → Grading
- **Progress Tracking**: Submission → Progress (aggregated metrics)

---

## Data Storage Details

### Firebase Firestore Collections:

All entities are stored as Firestore collections with the following naming convention (singular form):
- `user`
- `course`
- `module`
- `lesson`
- `enrollment`
- `assessment`
- `assignment`
- `submission`
- `progress`
- `forum`
- `setting`

### Firebase Storage Buckets:

Binary files are stored in Firebase Storage with the following path structure:
- `profile-pictures/{userId}/` - User profile pictures
- `course-materials/{courseId}/{moduleId}/{lessonId}/` - Lesson materials
- `submissions/{submissionId}/` - Assignment and assessment submissions
- `app-logo/` - Application logo

---

## Data Integrity and Constraints

1. **Referential Integrity**: Maintained through application-level validation:
   - Course IDs referenced in modules must exist
   - Module IDs referenced in lessons must exist
   - User IDs referenced throughout the system must exist

2. **Data Validation**: Enforced through:
   - Firestore Security Rules (access control)
   - Application-level validation (required fields, data types)
   - Client-side and server-side validation

3. **Timestamps**: Automatically managed using `serverTimestamp()` to ensure consistency across time zones and prevent client-side manipulation.

4. **Status Fields**: Enum-based status fields (e.g., `status: "draft" | "published"`, `role: "admin" | "teacher" | "student"`) ensure data consistency.

---

## Future Considerations

As the system evolves, additional entities may be added:
- **Notification** - For system notifications and alerts
- **Analytics** - For detailed analytics and reporting
- **AI Chat History** - For storing AI assistant conversation history
- **Learning Path** - For personalized learning path recommendations

