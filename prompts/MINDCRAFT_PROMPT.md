# MindCraft — Project Bootstrap Prompt (for Cursor)

> Paste this prompt into Cursor to set project context. Keep this file in the repo so all contributors can rehydrate the context quickly.

---

**PROMPT — MindCraft: AI-assisted learning platform (developer spec)**

> **Context / One-line:** MindCraft is a lightweight web learning platform for secondary school programming (age 16–17) that combines teacher-driven content, student practice, offline support, multilingual UI, and AI tools to generate and scaffold lesson content + assessments.

---

## Goals / priorities (what to deliver first)

1. **Essential (MVP / Sprint 1–2)** — Authentication (admin/teacher/student), course creation & management (teacher + admin approval), create/edit course materials, create basic assessments, student attempt & submission, progress dashboard (basic), assignment upload & teacher grading, discussion forum (basic).
2. **AI features (Sprint 3–4)** — AI-assisted lesson content generation; AI-generated exercises/assessments; student AI chat for coding help; learning recommendations.
3. **Non-functional priorities** — Offline sync (last-synced materials), multilingual UI (EN + BM; Mandarin optional), lightweight performance for low-end devices.

---

## Constraints & design decisions (must follow)

* Target: secondary school students + teachers (teacher-led workflows). Admins create users.
* Tech stack (use these): Frontend: **React + Next.js** (app router); Backend: **Next.js API routes**; DB: **Firebase Firestore** (+ Firebase Auth & Hosting); AI: **Google Gemini API** (or placeholder LLM); IDE/Dev: **VS Code**; VCS: **GitHub**; Analytics: **Firebase Analytics**.
* Keep client bundle small; serverless-friendly endpoints (Next.js API routes). Offline-first for learning materials (Firestore offline sync and localStorage/Fall back).
* Accessibility & simple UI for younger users.

---

## Scope to cut / postpone (not in MVP)

* Full Unity game engine levels (replace with simple browser games/visualizations).
* Complex industry networking features.
* Heavy real-time multiuser collaborative coding (can be simple shared snippets initially or integrate Replit later).
* Advanced personalization (defer to simple rule-based recommendations then AI suggestions).

---

## Actors / Roles

* **Admin** — create/edit/deactivate accounts, approve/delete courses.
* **Teacher** — create/update courses, upload/format content, generate content via AI, create assessments, grade assignments.
* **Student** — view courses, attempt assessments, upload assignments, view progress, use AI help, participate in forum.

---

## Key Modules & Endpoints (minimal set for Sprint 1)

### Firestore collections (core)

**⚠️ CRITICAL: All collections use SINGULAR names only. Do NOT use plural forms.**

* `user` `{ uid, name, email, role: "admin|teacher|student", profilePic, class, createdAt, status }`
* `course` `{ id, title, description, status: "draft|published", modules: [moduleIds], createdBy, createdAt, updatedAt }`
* `module` `{ id, courseId, title, order, lessons: [lessonIds] }`
* `lesson` `{ id, moduleId, title, contentHtml, materials: [storageUrls], aiGenerated: bool, updatedAt }`
* `assessment` `{ id, courseId, title, type: "quiz|coding|assignment", questions: [...], config: {start,end,timer,attempts}, published }`
* `assignment` `{ id, courseId, title, description, deadline, status, isOpen, allowLateSubmissions }`
* `submission` `{ id, assessmentId, assignmentId, studentId, files:[url], answers: {...}, score, totalPoints, grade, feedback, status, submittedAt }`
* `enrollment` `{ studentId, courseId, enrolledAt, progress: {...} }`
* `progress` (or derive on the fly) `{ studentId, courseId, metrics: {...} }`
* `forum` `{ id, courseId, authorId, content, replies, pinned, deleted }`
* `setting` `{ key, value, updatedAt }`

**Collection Naming Rules:**
- ✅ Always use singular: `collection(db, 'user')` 
- ❌ Never use plural: `collection(db, 'users')` - DEPRECATED
- Migration from plural to singular is complete - do not create plural collections
- Reference `docs/FIRESTORE_SECURITY_RULES.md` for current collection structure

### Minimal API routes (Next.js API)

* `POST /api/courses` — create course (teacher). Payload `{title, description, modules?}`. Server writes `course`.
* `PUT /api/courses/:id` — edit course + reorder modules.
* `GET /api/courses` — list courses (filter: published/draft).
* `POST /api/lessons` — create/update lesson. Save `contentHtml` and materials.
* `POST /api/assessments` — create assessment (questions optional).
* `GET /api/assessments/:id` — fetch assessment for student.
* `POST /api/submissions` — submit answers/files.
* `GET /api/submissions?assessmentId=&studentId=` — for grading.
* `POST /api/ai/generate-content` — main AI endpoint for lesson scaffolding (accepts `type: "lesson"|"exercise"` and `inputText` or `lessonId`).
* `POST /api/auth/*` — rely on Firebase Auth (use only server as needed for role enforcement).

---

## Frontend pages / components (priority)

Pages: `/login`, `/dashboard`, `/dashboard/courses`, `/dashboard/courses/new`, `/dashboard/courses/[id]`, `/dashboard/courses/[id]/modules/[mid]/lessons/[lid]`, `/assessments/[id]`, `/assignments/[id]`, `/progress`, `/analytics/class`, `/forum`.

Components: `CourseForm`, `ModuleEditor`, `LessonEditor`, `AssessmentBuilder`, `SubmissionUploader`, `ProgressDashboard`, `AIContentModal`.

---

## AI integration — endpoint & prompt templates

Endpoint: `POST /api/ai/generate-content` → server calls Gemini API (or dev stub).

Example request JSON and prompt templates are identical to this document’s “AI integration” section in the original specification.

---

## Offline behavior (high level)

- Cache last-synced course/lesson content in IndexedDB (prefer Firestore SDK offline where possible).
- When offline, lesson viewing should use local cache; submissions are queued locally and sync when online.
- UI must show “offline mode — last synced on [date]”.

---

## Acceptance criteria (developer test checklist)

- Auth: roles enforced.
- Course creation: draft/publish; `createdBy` and timestamps stored.
- Module ordering persists.
- Lesson editor saves `contentHtml`.
- Assessment creation and submission flows.
- Progress dashboard basic metrics.
- AI endpoint: stub returns deterministic JSON.
- Offline: cached lessons viewable after initial sync.

---

## Sprint 1 deliverables (starter code present)

- `firebase.js` init with `db`, `auth`
- `app/api/courses/route.js` (POST/GET)
- `app/dashboard/courses/new/page.jsx` (CourseForm)
- `app/api/ai/route.js` (AI stub)
- `README.md` with run steps and `.env` notes

---

## Developer guidelines

- TypeScript preferred; otherwise ESLint + Prettier.
- Firestore rules for RBAC.
- Sanitize lesson HTML and escape on view.
- Log AI outputs and teacher edits for audit.


