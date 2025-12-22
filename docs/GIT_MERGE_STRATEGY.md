# Git Merge Strategy & Database Migration Guide

## Current Situation

- **Your Local Version**: Has new features (learning recommendations, download functionality, etc.) that aren't on GitHub
- **GitHub Version**: Your team members are working on this outdated version
- **Database Issue**: Schema changes in your local version don't match what's in production/GitHub version, causing view errors

## Safe Merge Strategy

### Step 1: Backup Your Current Work

```bash
# Create a backup branch of your current work
git checkout -b backup-local-changes-$(date +%Y%m%d)
git add .
git commit -m "Backup: Local changes before merge"

# Or create a backup folder outside git
# Copy your entire project folder to a safe location
```

### Step 2: Document Your Changes

Create a list of:
- New files you've created
- Files you've modified
- Database schema changes
- New features added

### Step 3: Stash or Commit Your Changes

**Option A: Stash (if you want to review GitHub changes first)**
```bash
git stash save "Local changes - learning recommendations, downloads, etc."
```

**Option B: Commit to a feature branch (RECOMMENDED)**
```bash
# Create a feature branch for your changes
git checkout -b feature/learning-recommendations-and-downloads
git add .
git commit -m "Add learning recommendations page and download functionality"
```

### Step 4: Sync with GitHub

```bash
# Add remote if not already added
git remote add origin <your-github-repo-url>

# Fetch latest from GitHub
git fetch origin

# Check what branch your team is working on (usually 'main' or 'master')
git branch -r

# See what's different
git log HEAD..origin/main --oneline
```

### Step 5: Merge Strategy

**Option A: Merge GitHub changes into your branch (RECOMMENDED)**
```bash
# Make sure you're on your feature branch
git checkout feature/learning-recommendations-and-downloads

# Merge GitHub's main branch into yours
git merge origin/main

# Resolve any conflicts manually
# Git will mark conflicts with <<<<<<< HEAD markers
```

**Option B: Rebase your changes on top of GitHub (Advanced)**
```bash
git rebase origin/main
# Resolve conflicts as they appear
git rebase --continue
```

### Step 6: Resolve Conflicts

When conflicts occur:
1. Open conflicted files
2. Look for `<<<<<<< HEAD` markers
3. Choose which code to keep (yours, theirs, or combine)
4. Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
5. Test thoroughly

### Step 7: Test Everything

After merging:
- Test all your new features
- Test existing features that team members modified
- Check database operations
- Verify views render correctly

### Step 8: Push Your Merged Branch

```bash
# Push your feature branch
git push origin feature/learning-recommendations-and-downloads

# Create a Pull Request on GitHub for team review
# Or merge directly if you have permissions
```

## Database Migration Strategy

### Problem: Schema Mismatch

Your local version expects certain fields/collections that GitHub version doesn't have, or vice versa.

### Solution: Create Migration Scripts

1. **Document Schema Differences**
   - List all collections that changed
   - List all fields that were added/removed
   - Note any data structure changes

2. **Create Backward-Compatible Code**
   - Add checks for missing fields
   - Provide default values
   - Handle both old and new schema versions

3. **Migration Script Example**

Create `scripts/migrate-database.js`:

```javascript
// Example: Handle both old and new enrollment schema
async function getEnrollment(studentId, courseId) {
  const enrollmentRef = doc(db, 'enrollment', `${studentId}_${courseId}`);
  const enrollmentDoc = await getDoc(enrollmentRef);
  
  if (!enrollmentDoc.exists()) {
    return null;
  }
  
  const data = enrollmentDoc.data();
  
  // Handle both old and new schema
  return {
    studentId: data.studentId,
    courseId: data.courseId,
    enrolledAt: data.enrolledAt,
    // New schema has nested progress object
    progress: data.progress || {
      completedModules: data.completedModules || [],
      completedLessons: data.completedLessons || [],
      overallProgress: data.overallProgress || 0
    }
  };
}
```

### Quick Fix: Add Schema Compatibility Layer

Add this to files that read from Firestore:

```javascript
// Helper function to ensure backward compatibility
function normalizeEnrollmentData(data) {
  if (!data) return null;
  
  // If old schema (flat structure)
  if (data.completedLessons && !data.progress) {
    return {
      ...data,
      progress: {
        completedModules: data.completedModules || [],
        completedLessons: data.completedLessons || [],
        overallProgress: data.overallProgress || 0
      }
    };
  }
  
  // If new schema (nested progress)
  return {
    ...data,
    progress: data.progress || {
      completedModules: [],
      completedLessons: [],
      overallProgress: 0
    }
  };
}
```

## Recommended Workflow Going Forward

### 1. Feature Branch Workflow

```bash
# Always create a feature branch for new work
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
# Create PR on GitHub
```

### 2. Regular Sync

```bash
# Daily: Pull latest changes from main
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main  # or rebase
```

### 3. Communication

- Use GitHub Issues to track features
- Update team on schema changes
- Document breaking changes

## Emergency Rollback

If merge goes wrong:

```bash
# Abort merge
git merge --abort

# Or reset to before merge
git reset --hard HEAD~1

# Or go back to your backup branch
git checkout backup-local-changes-YYYYMMDD
```

## Next Steps

1. **Immediate**: Create backup branch
2. **Today**: Document your changes
3. **Today**: Create feature branch and commit
4. **Today**: Fetch and review GitHub changes
5. **Tomorrow**: Merge carefully, test thoroughly
6. **After merge**: Add schema compatibility code
7. **After merge**: Push and create PR

## Need Help?

If you encounter issues:
1. Don't force push to main/master
2. Keep your backup branch safe
3. Test in a separate environment first
4. Ask team members to review your PR

