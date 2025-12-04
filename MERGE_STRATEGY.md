# Merge Strategy for MindCraft

## Current State
- **Base Branch**: `main` (current working version)
- **Uncommitted Changes**: Many modified files + new features (AI, progress, assessments, etc.)
- **Priority**: Preserve current version, only add missing features

## Step-by-Step Merge Process

### Phase 1: Preserve Current Work
1. **Commit current changes** to a backup branch
2. **Create a feature branch** from current main
3. **Document current features** for comparison

### Phase 2: Review Incoming Changes
1. **List all PRs/branches** to merge
2. **For each PR/branch:**
   - Review file-by-file changes
   - Identify what's already implemented
   - Identify new features not in current version
   - Identify breaking changes or conflicts

### Phase 3: Selective Merging
1. **Create a merge branch** from main
2. **Cherry-pick** only useful changes
3. **Manually merge** non-conflicting features
4. **Test** after each merge

### Phase 4: Validation
1. **Run linter** checks
2. **Test critical paths:**
   - Login/Auth
   - Course creation
   - Assessment/Assignment creation
   - Student enrollment
   - Progress tracking
3. **Check for breaking changes**

## Tools for Review

### Compare Files
```bash
# See what changed in a branch
git diff main..<branch-name> -- <file-path>

# See all changed files
git diff main..<branch-name> --name-only

# See summary
git diff main..<branch-name> --stat
```

### Safe Merge Commands
```bash
# Create backup
git branch backup-main

# Create merge branch
git checkout -b merge-review

# Review specific file changes
git diff main..<branch> -- <file>

# Cherry-pick specific commits
git cherry-pick <commit-hash>
```

## Checklist Before Merging Each PR/Branch

- [ ] Does this feature already exist? (Skip if yes)
- [ ] Does this conflict with current implementation?
- [ ] Are dependencies compatible?
- [ ] Does it break existing functionality?
- [ ] Is the code style consistent?
- [ ] Are there tests? (if applicable)

