# Pull Request Merge Guide - Ensuring Contributions Count

## Understanding GitHub Contribution Tracking

**Important**: GitHub tracks contributions based on:
1. **Commits to the default branch** (usually `main`)
2. **Commits must be merged** (not just pushed to a branch)
3. **Author email** must match your GitHub account email

## Merge Methods & Contribution Tracking

### ✅ Method 1: "Create a merge commit" (RECOMMENDED for your situation)

**What it does:**
- Creates a merge commit that combines all commits from the PR branch
- Preserves all individual commit history
- **All commits count as contributions** ✅
- Shows clear merge history

**When to use:**
- When you want to preserve full commit history
- When multiple people worked on the PR
- **Best for your lecturer's marking** - shows all contributions clearly

**How to do it:**
1. On GitHub, go to the PR page
2. Click "Merge pull request"
3. Select "Create a merge commit"
4. Click "Confirm merge"

### ⚠️ Method 2: "Squash and merge"

**What it does:**
- Combines all PR commits into ONE commit
- **Only ONE commit counts as contribution** ⚠️
- Loses individual commit history
- Cleaner history but less detail

**When to use:**
- When PR has many small/experimental commits
- When you want cleaner history
- **NOT recommended for marking** - loses contribution details

### ⚠️ Method 3: "Rebase and merge"

**What it does:**
- Replays PR commits on top of main
- Preserves individual commits
- **All commits count** ✅
- Creates linear history (no merge commits)

**When to use:**
- When you want linear history
- When PR is small and clean
- Can be confusing if conflicts occur

## Recommended Workflow for Your Situation

Since your lecturer counts marks from **contributions and direct commits to main**, here's the best approach:

### Step 1: Commit Your Current Changes First

```bash
# Make sure you're on your merge branch
git checkout merge-all-prs

# Add all your changes
git add .

# Commit with descriptive message
git commit -m "Fix: Resolve assessment enrollment filtering and undefined field errors"

# Push to remote
git push origin merge-all-prs
```

### Step 2: Create/Update PR for Your Branch

1. Go to GitHub → Pull Requests
2. Create a new PR from `merge-all-prs` → `main` (or update existing one)
3. Add description of all merged features

### Step 3: Merge PRs in Order (Oldest to Newest)

For each PR on GitHub:

1. **Review the PR** - Check what it adds
2. **Click "Merge pull request"**
3. **Select "Create a merge commit"** (NOT squash!)
4. **Confirm merge**
5. **Delete the branch** (optional, keeps things clean)

### Step 4: Verify Contributions

After merging, check:

```bash
# Pull latest main
git checkout main
git pull origin main

# Check commit history
git log --oneline --all --graph

# Check your contributions
git log --author="your-email@example.com" --oneline
```

## Important Notes for Marking

### ✅ What Counts as Contributions:

1. **Direct commits to main** (after merge)
2. **Commits in merged PRs** (if using "Create merge commit" or "Rebase")
3. **Merge commits** themselves (shows you merged the PR)

### ❌ What Doesn't Count:

1. **Unmerged branches** (even if pushed to GitHub)
2. **Squashed commits** (only 1 commit counts instead of many)
3. **Commits in closed (not merged) PRs**

## Best Practice Checklist

Before merging each PR:

- [ ] PR is reviewed and tested
- [ ] All conflicts are resolved
- [ ] PR description explains what it does
- [ ] Commits have clear messages
- [ ] You're using "Create a merge commit" method

After merging:

- [ ] Pull latest main locally: `git checkout main && git pull`
- [ ] Test the merged code
- [ ] Verify your commits appear in main's history
- [ ] Update any documentation if needed

## Example: Merging PR #1

```bash
# 1. Make sure main is up to date
git checkout main
git pull origin main

# 2. On GitHub, merge PR #1 using "Create a merge commit"

# 3. Pull the merged changes
git pull origin main

# 4. Verify the merge
git log --oneline -5
# You should see a merge commit like:
# "Merge pull request #1 from username/branch-name"
```

## Troubleshooting

### If contributions aren't showing:

1. **Check email matches**: 
   ```bash
   git config user.email
   # Should match your GitHub account email
   ```

2. **Check commits are in main**:
   ```bash
   git log --oneline main
   ```

3. **Verify merge method**: Make sure you used "Create a merge commit", not "Squash"

### If you accidentally used "Squash and merge":

- The PR is already merged, can't change it
- But future PRs: use "Create a merge commit"
- Your contribution still counts (as 1 commit), just less detailed

## Summary

**For maximum contribution tracking:**
1. ✅ Use "Create a merge commit" for all PRs
2. ✅ Commit your work before merging
3. ✅ Merge PRs in logical order
4. ✅ Verify commits appear in main after merge
5. ✅ Keep commit messages clear and descriptive

This ensures your lecturer can see:
- All your individual commits
- All merged PRs
- Clear contribution history
- Your work in the main branch

