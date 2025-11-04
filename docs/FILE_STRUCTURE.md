# Repository Structure

```
MindCraft/
├─ app/
│  ├─ api/
│  │  ├─ ai/route.js
│  │  └─ courses/route.js
│  ├─ dashboard/
│  │  └─ courses/
│  │     └─ new/
│  │        └─ page.jsx
│  ├─ login/ (planned)
│  ├─ page.jsx (planned landing)
│  └─ layout.jsx (planned root layout)
├─ components/ (planned UI components)
├─ lib/ (helpers, firebase admin if needed later)
├─ hooks/ (custom hooks, e.g., useOffline)
├─ styles/ (global.css, module.css)
├─ public/ (static assets)
├─ docs/
│  ├─ VISION.md
│  ├─ ARCHITECTURE.md
│  ├─ CONTRIBUTING.md
│  └─ FILE_STRUCTURE.md
├─ prompts/
│  └─ MINDCRAFT_PROMPT.md
├─ firebase.js
├─ README.md
├─ .env.example (create locally; see README)
└─ package.json (from Next.js setup)
```

Notes:
- Some files are placeholders/planned; build them as features land.
- See `prompts/MINDCRAFT_PROMPT.md` for the full product/developer spec to load in Cursor.


