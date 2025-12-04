# Contributing

## Branching
- `main`: protected, release-ready
- Feature branches: `feat/<short-name>`
- Fix branches: `fix/<short-name>`

## PRs
- Small, focused PRs
- Include description and screenshots for UI
- Link issues/tasks

## Code Style
- Prefer TypeScript; else JS with ESLint + Prettier
- Descriptive variable names; avoid 1–2 letter names
- Add comments only for non-obvious logic

## Commit Messages
- Conventional commits (e.g., `feat: add CourseForm`, `fix: handle empty title`)

## Local Setup
- Clone the repository
- Install dependencies: `npm install`
- Set up environment variables:
  - You'll receive a `.env` file from the team lead (via secure channel)
  - Copy it to the project root, or create `.env` from `.env.example` and fill in values
- Run dev server: `npm run dev`

## Firestore Collections - IMPORTANT

**⚠️ Always use SINGULAR collection names**

All Firestore collections use singular naming:
- `user`, `course`, `module`, `lesson`, `assessment`, `assignment`, `submission`, `enrollment`, `progress`, `forum`, `setting`

**Never use plural forms** (e.g., `users`, `courses`) - they are deprecated.

See `docs/AGENTIC_GUIDELINES.md` for detailed guidelines, especially if using AI coding assistants.


