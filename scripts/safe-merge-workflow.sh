#!/bin/bash
# Safe Git Merge Workflow Script
# This script helps you safely merge your local changes with GitHub

set -e  # Exit on error

echo "🚀 Safe Git Merge Workflow"
echo "=========================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not found!"
    echo ""
    echo "Initializing git repository..."
    git init
    echo "✅ Git initialized"
    echo ""
    read -p "Enter your GitHub repository URL: " REPO_URL
    if [ ! -z "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "✅ Remote added: $REPO_URL"
    fi
    echo ""
fi

# Step 1: Check current status
echo "📊 Step 1: Checking current status..."
git status
echo ""

# Step 2: Create backup branch
echo "💾 Step 2: Creating backup branch..."
BACKUP_BRANCH="backup-local-changes-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH" 2>/dev/null || git checkout "$BACKUP_BRANCH"
git add .
git commit -m "Backup: Local changes before merge - $(date)" || echo "No changes to commit"
echo "✅ Backup branch created: $BACKUP_BRANCH"
echo ""

# Step 3: Create feature branch
echo "🌿 Step 3: Creating feature branch for your changes..."
FEATURE_BRANCH="feature/local-changes-$(date +%Y%m%d)"
git checkout -b "$FEATURE_BRANCH" 2>/dev/null || git checkout "$FEATURE_BRANCH"
echo "✅ Feature branch: $FEATURE_BRANCH"
echo ""

# Step 4: Commit current changes
echo "📝 Step 4: Committing your changes..."
git add .
read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Add learning recommendations, download functionality, and schema compatibility"
fi
git commit -m "$COMMIT_MSG" || echo "No changes to commit"
echo "✅ Changes committed"
echo ""

# Step 5: Fetch from origin
echo "⬇️  Step 5: Fetching latest from GitHub..."
git fetch origin || echo "⚠️  Could not fetch from origin. Make sure remote is configured."
echo ""

# Step 6: Check what branch to merge from
echo "🔍 Step 6: Checking remote branches..."
git branch -r | head -5
echo ""
read -p "Enter branch to merge from (default: origin/main): " MERGE_BRANCH
if [ -z "$MERGE_BRANCH" ]; then
    MERGE_BRANCH="origin/main"
fi

# Step 7: Merge
echo "🔄 Step 7: Merging $MERGE_BRANCH into your feature branch..."
echo "⚠️  This may create conflicts that need manual resolution."
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    git merge "$MERGE_BRANCH" || {
        echo ""
        echo "⚠️  Merge conflicts detected!"
        echo ""
        echo "To resolve conflicts:"
        echo "1. Open conflicted files (marked with <<<<<<< HEAD)"
        echo "2. Resolve conflicts manually"
        echo "3. Stage resolved files: git add <file>"
        echo "4. Complete merge: git commit"
        echo ""
        echo "Or abort merge: git merge --abort"
        exit 1
    }
    echo "✅ Merge completed successfully!"
else
    echo "❌ Merge cancelled"
    exit 0
fi

echo ""
echo "✅ Workflow completed!"
echo ""
echo "Next steps:"
echo "1. Test your application thoroughly"
echo "2. Push your branch: git push origin $FEATURE_BRANCH"
echo "3. Create a Pull Request on GitHub"
echo ""

