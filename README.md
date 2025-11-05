# MindCraft

AI-assisted learning platform for secondary school programming education.

## 🚀 Quick Start

### For Team Members

See **[docs/TEAM_SETUP.md](./docs/TEAM_SETUP.md)** for complete setup instructions.

**Quick steps:**
1. Clone the repo: `git clone https://github.com/MahWilson/MindCraft.git`
2. Install dependencies: `npm install`
3. Get `.env` file from team lead (via secure channel)
4. Copy `.env` to project root
5. Run: `npm run dev`

### For New Developers

1. Read [docs/TEAM_SETUP.md](./docs/TEAM_SETUP.md)
2. Read [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
3. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 📚 Documentation

- **[TEAM_SETUP.md](./docs/TEAM_SETUP.md)** - Getting started guide
- **[FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md)** - Firebase configuration
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - Development guidelines
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)** - Data migration guide

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting (planned)

## 📝 Environment Variables

Create a `.env` file in the project root with Firebase configuration. See `.env.example` for template.

**⚠️ Important:** Never commit `.env` file to Git! It's in `.gitignore`.

## 🔐 Getting Firebase Credentials

Contact the team lead to receive the `.env` file or Firebase project access.

## 📦 Project Status

✅ **Completed:**
- Firebase Auth integration
- Firestore database setup
- Course management (CRUD)
- Role-based access control
- User registration

🚧 **In Progress:**
- Course modules/lessons
- Assessments
- Student submissions

📋 **Planned:**
- AI features (Gemini API)
- Progress tracking
- Discussion forum
- Offline support
