# Merge Checklist - Feature by Feature

Use this checklist to systematically review and merge features.

## 🎯 Current Features (DO NOT OVERWRITE)

These exist in your current version and should be preserved:
- ✅ Assessments (create, edit, take, submit)
- ✅ Assignments (create, edit, submit)
- ✅ Progress tracking
- ✅ AI features (coding help, explain concept)
- ✅ Language toggle (EN/BM)
- ✅ Course enrollment
- ✅ Module/Lesson management
- ✅ Admin/Teacher/Student roles
- ✅ Firestore with singular collections

## 📋 Feature Review Checklist

### Forum Feature (omar-module7-forum) ⭐

**Files to extract:**
- [ ] `app/forum/page.jsx` - Forum list
- [ ] `app/forum/[id]/page.jsx` - Forum topic detail
- [ ] `components/ui/badge.jsx` - Badge component
- [ ] `components/ui/textarea.jsx` - Textarea component
- [ ] `docs/FORUM_SCHEMA.md` - Documentation

**Pre-merge checks:**
- [ ] Check if forum already exists: `ls app/forum/`
- [ ] Review forum implementation: `git show origin/omar-module7-forum:app/forum/page.jsx`
- [ ] Check dependencies: `git show origin/omar-module7-forum:package.json`
- [ ] Check Firestore rules for forum: `grep -i forum docs/FIRESTORE_SECURITY_RULES.md`

**Merge steps:**
```bash
# 1. Extract files
node scripts/safe-extract.js origin/omar-module7-forum \
  app/forum/page.jsx \
  app/forum/[id]/page.jsx \
  components/ui/badge.jsx \
  components/ui/textarea.jsx

# 2. Check for conflicts
git status

# 3. Review extracted files
code app/forum/

# 4. Test
npm run dev
# Navigate to /forum

# 5. If good, commit
git add app/forum/ components/ui/badge.jsx components/ui/textarea.jsx
git commit -m "feat: Add forum feature from omar-module7-forum"
```

**Post-merge checks:**
- [ ] Forum page loads without errors
- [ ] Can create topics
- [ ] Can reply to topics
- [ ] Navigation includes forum link
- [ ] Firestore rules allow forum access

---

### Assessment Configuration (omar-branch2)

**Files to review:**
- [ ] `app/api/assessments/[id]/check-availability/route.js`
- [ ] `app/api/assessments/[id]/config/route.js`
- [ ] `app/assessments/configure/[id]/page.jsx`

**Decision needed:**
- [ ] Does current assessment implementation need these?
- [ ] Are these features already covered?
- [ ] Would these improve the current system?

**Action:** ⚠️ REVIEW FIRST - May not be needed

---

### User Management (Elganzory, omar-branch)

**Files to check:**
- [ ] `app/api/users/[id]/route.js`
- [ ] `app/dashboard/users/page.jsx`

**Pre-merge checks:**
- [ ] Compare with current admin user management
- [ ] Check if features are already implemented
- [ ] Review if implementation is better

**Action:** ⚠️ COMPARE FIRST - May already exist

---

### Profile Features (feature/sprint1-knan)

**Files to check:**
- [ ] `app/api/changePassword/route.js`
- [ ] `app/api/uploadProfilePicture/route.js`
- [ ] `app/components/ChangePassword.jsx`
- [ ] `app/components/UploadProfilePicture.jsx`

**Pre-merge checks:**
- [ ] Check current profile page: `grep -r "changePassword\|uploadProfile" app/profile/`
- [ ] Check if API routes exist: `ls app/api/users/[uid]/`

**Action:** ⚠️ VERIFY FIRST - May already exist

---

## 🚫 Branches to Skip

- ❌ `origin/Elganzory` - Too outdated (deletes 77 files)
- ❌ `origin/feature/sprint1-knan` - Too outdated (deletes 76 files)
- ❌ `origin/omar-branch` - Too outdated (deletes 77 files)

**Reason:** These branches are from an older codebase structure and would break current implementation.

---

## ✅ Safe Merge Workflow

1. **Backup first:**
   ```bash
   git add .
   git commit -m "WIP: Before merge - [date]"
   git branch backup-before-merge
   ```

2. **Extract one feature at a time:**
   ```bash
   node scripts/safe-extract.js <branch> <file1> <file2> ...
   ```

3. **Test immediately:**
   ```bash
   npm run dev
   # Test the feature
   ```

4. **Commit if good, restore if bad:**
   ```bash
   # Good
   git add .
   git commit -m "feat: Add [feature]"
   
   # Bad
   git restore <files>
   ```

5. **Repeat for next feature**

---

## 🔍 Validation Commands

```bash
# Check if feature exists
ls app/forum/ 2>/dev/null && echo "Forum exists" || echo "Forum missing"

# Compare implementations
git diff main..origin/omar-module7-forum -- app/forum/page.jsx

# Check for conflicts
git merge --no-commit --no-ff origin/omar-module7-forum
git merge --abort

# Check dependencies
git show origin/omar-module7-forum:package.json | grep -A 5 "dependencies"
```

---

## 📝 Merge Log

Track what you've merged:

- [ ] Forum feature - Date: ____ - Status: ____
- [ ] Assessment config - Date: ____ - Status: ____
- [ ] User management - Date: ____ - Status: ____
- [ ] Profile features - Date: ____ - Status: ____

---

## ⚠️ Red Flags (Don't Merge If)

- Branch deletes files that exist in current version
- Branch changes core structure (layout, routing)
- Branch has breaking changes to APIs
- Branch conflicts with current features
- Branch is from very old codebase structure

