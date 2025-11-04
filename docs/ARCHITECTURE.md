# Architecture Overview

## Stack
- UI: Next.js (App Router) + React
- Backend: Next.js API routes
- Data: Firebase Firestore
- Auth/Hosting/Analytics: Firebase
- AI: Gemini API (stubbed now)

## Modules
- Auth & RBAC (admin/teacher/student)
- Courses/Modules/Lessons
- Assessments & Submissions
- Progress (basic aggregates)
- Forum (basic threads)
- AI Content Generation (server endpoint)
- Offline (Firestore persistence + local cache)

## API (initial)
- `POST /api/courses` create
- `GET /api/courses` list
- `POST /api/ai` deterministic stub

## Data Model (simplified)
- See `docs/VISION.md` collections list for fields.

## Security
- Firestore Rules to enforce roles and resource ownership
- Server-side token verification for write endpoints (planned)
- Input sanitization for HTML content


