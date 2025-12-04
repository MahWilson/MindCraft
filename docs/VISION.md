# MindCraft — Vision (Sprint 1–2)

MindCraft is a lightweight web learning platform for secondary school programming (age 16–17) that combines teacher-driven content, student practice, offline support, multilingual UI, and AI tools to generate and scaffold lesson content + assessments.

## MVP Goals (Sprint 1–2)
- Authentication with roles: admin, teacher, student
- Course creation & management (teacher; admin approval optional)
- Create/edit course materials
- Create basic assessments; student attempt & submission
- Progress dashboard (basic)
- Assignment upload & teacher grading
- Discussion forum (basic)

## AI (later sprints)
- AI-assisted lesson content generation
- AI-generated exercises/assessments
- Student AI chat for coding help
- Learning recommendations

## Constraints
- Tech: Next.js (App Router), Next.js API routes, Firebase Firestore/Auth/Hosting, Gemini API (or stub), Firebase Analytics
- Offline-first for learning materials; small client bundle; accessible UI

## Firestore (core collections)

**⚠️ IMPORTANT: Use SINGULAR collection names only**

All Firestore collections use **singular** naming convention:
- `user` (NOT `users`)
- `course` (NOT `courses`)
- `module` (NOT `modules`)
- `lesson` (NOT `lessons`)
- `assessment` (NOT `assessments`)
- `assignment` (NOT `assignments`)
- `submission` (NOT `submissions`)
- `enrollment` (NOT `enrollments`)
- `progress` (NOT `progresses`)
- `forum` (NOT `forums`)
- `setting` (NOT `settings`)

**For AI Agents/Developers:**
- Always use singular collection names when creating new collections or referencing existing ones
- Do NOT create plural versions - they are deprecated
- Check `docs/FIRESTORE_SECURITY_RULES.md` for current collection names
- Migration from plural to singular has been completed - do not revert

## Acceptance (Sprint 1)
- Teacher can create course (draft/published), persisted with timestamps and createdBy
- Module order persists
- Teacher can create lesson with `contentHtml`
- Teacher can create assessment, student can upload submission; teacher can view
- Student dashboard shows basic completion
- AI endpoint returns deterministic JSON (stub)
- Lessons viewable offline after initial sync


