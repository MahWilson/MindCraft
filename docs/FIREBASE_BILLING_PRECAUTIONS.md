# Firebase Billing Precautions for Shared Projects

## Free Tier Limits (Blaze Plan)

**Firebase Storage Free Tier:**
- **5 GB** total storage
- **1 GB** downloads per day
- **20,000** upload operations per day
- **50,000** download operations per day

**Important:** You only pay if you exceed these limits. The free tier resets daily/monthly.

## Essential Precautions

### 1. Set Up Billing Alerts (CRITICAL)

**Step 1: Enable Billing Alerts**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click the **gear icon** ⚙️ → **Usage and billing**
3. Click **Set budget alert**
4. Set alerts at:
   - **$1** (first warning)
   - **$5** (serious warning)
   - **$10** (critical - consider disabling)

**Step 2: Set Budget Limits**
1. In Google Cloud Console → **Billing** → **Budgets & alerts**
2. Create a budget with:
   - **Amount:** $5/month (or your comfort level)
   - **Alert threshold:** 50%, 90%, 100%
   - **Action:** Email all team members

### 2. Monitor Usage Regularly

**Check Storage Usage:**
1. Firebase Console → **Storage** → **Usage** tab
2. Check:
   - Total storage used
   - Daily download bandwidth
   - Number of files

**Check Daily:**
- Go to Firebase Console → **Usage and billing**
- Review daily usage charts
- Set a calendar reminder to check weekly

### 3. Implement Code-Level Limits

Add these limits to your upload code to prevent accidental large uploads:

```javascript
// In your file upload function
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file (not 50MB)
const MAX_FILES_PER_LESSON = 5; // Limit files per lesson
const MAX_TOTAL_STORAGE_PER_USER = 100 * 1024 * 1024; // 100MB per user

// Check before upload
if (file.size > MAX_FILE_SIZE) {
  alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  return;
}
```

### 4. Set Up Usage Quotas (Recommended)

**In Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Quotas**
3. Search for "Firebase Storage"
4. Set quotas to:
   - **Storage:** 4 GB (80% of free tier)
   - **Downloads:** 800 MB/day (80% of free tier)
   - **Uploads:** 15,000/day (75% of free tier)

This will **automatically block** operations when you reach 80% of free tier limits.

### 5. Team Communication Rules

**Create a shared document with:**
- ✅ **File size limits:** Max 10MB per file
- ✅ **File type restrictions:** Only PDF, DOCX, images
- ✅ **Upload guidelines:** No videos unless necessary
- ✅ **Cleanup policy:** Delete old/unused files monthly
- ✅ **Testing limits:** Use small test files (< 1MB) for development

**Post in your team chat:**
```
⚠️ FIREBASE STORAGE LIMITS ⚠️
- Max file size: 10MB
- Max files per lesson: 5
- No videos unless approved
- Delete test files after testing
```

### 6. Implement Automatic Cleanup

Add a cleanup function to remove old test files:

```javascript
// Run this monthly to clean up old files
async function cleanupOldTestFiles() {
  // Delete files older than 30 days that are marked as "test"
  // Or files from deleted lessons
}
```

### 7. Use File Compression

For images, compress before upload:
- Use libraries like `browser-image-compression`
- Compress images to max 2MB before upload
- This saves storage space

### 8. Monitor Per-User Usage

Track how much each team member uploads:

```javascript
// Store user upload stats in Firestore
const userUploadStats = {
  totalSize: 0,
  fileCount: 0,
  lastUpload: null
};

// Check before allowing upload
if (userUploadStats.totalSize > MAX_TOTAL_STORAGE_PER_USER) {
  alert('You have reached your upload limit. Please delete old files.');
  return;
}
```

## Daily Checklist for Team Leads

- [ ] Check Firebase Console → Usage and billing
- [ ] Review Storage usage (should be < 4 GB)
- [ ] Check for large files (> 10MB)
- [ ] Verify no test files accumulating
- [ ] Review billing alerts (should be $0)

## Warning Signs

**🚨 Red Flags:**
- Storage usage > 4 GB (80% of limit)
- Daily downloads > 800 MB
- Billing shows any charges
- Multiple large files (> 10MB each)

**Action if you see these:**
1. Immediately check what's using storage
2. Delete unnecessary files
3. Notify team to stop uploading
4. Review Firebase Console → Storage → Files

## Emergency Procedures

### If You Exceed Free Tier

1. **Immediate Actions:**
   - Go to Firebase Console → Storage → Files
   - Delete large/unnecessary files
   - Check what's using the most space

2. **Disable Uploads Temporarily:**
   ```javascript
   // Add a feature flag
   const UPLOADS_ENABLED = false; // Set to false in emergency
   
   if (!UPLOADS_ENABLED) {
     alert('File uploads are temporarily disabled. Please contact admin.');
     return;
   }
   ```

3. **Set Hard Limits:**
   - Reduce max file size to 5MB
   - Limit files per lesson to 3
   - Disable video uploads

### If Billing Alert Triggers

1. **Check Google Cloud Console → Billing**
2. **Review charges** (should be $0 if under free tier)
3. **Set budget to $0** to prevent any charges
4. **Contact team** to stop all uploads
5. **Clean up storage** immediately

## Best Practices for Shared Projects

### 1. Use Environment Variables

```javascript
// .env.local
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  // 10MB in bytes
NEXT_PUBLIC_MAX_FILES_PER_LESSON=5
NEXT_PUBLIC_STORAGE_ENABLED=true
```

### 2. Add Usage Dashboard

Create a simple page showing:
- Total storage used
- Files count
- Daily download bandwidth
- Warning if approaching limits

### 3. Implement Approval System

For large files (> 5MB), require admin approval:
```javascript
if (file.size > 5 * 1024 * 1024) {
  // Require admin approval before upload
  await requestAdminApproval(file);
}
```

### 4. Regular Cleanup Schedule

Set a monthly reminder to:
- Delete test files
- Remove files from deleted lessons
- Archive old course materials
- Compress large images

## Monitoring Tools

### Firebase Console
- **Storage → Usage:** See total storage
- **Usage and billing:** See daily usage
- **Storage → Files:** Browse and delete files

### Google Cloud Console
- **Billing → Overview:** See charges (should be $0)
- **Storage → Browser:** See all files
- **IAM & Admin → Quotas:** Set hard limits

## Recommended Settings

**For a shared school project:**
- ✅ Max file size: **10MB** (not 50MB)
- ✅ Max files per lesson: **5**
- ✅ Budget alert: **$1**
- ✅ Storage quota: **4 GB** (80% of free tier)
- ✅ Daily check: **Storage usage**
- ✅ Weekly review: **Billing dashboard**

## Code Example: Safe Upload Function

```javascript
// Safe upload with all precautions
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_LESSON = 5;

async function safeFileUpload(file, lessonId) {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // 2. Check file count for this lesson
  const existingFiles = await getLessonFiles(lessonId);
  if (existingFiles.length >= MAX_FILES_PER_LESSON) {
    throw new Error(`Maximum ${MAX_FILES_PER_LESSON} files per lesson`);
  }
  
  // 3. Check total storage (optional)
  const totalStorage = await getTotalStorageUsed();
  if (totalStorage > 4 * 1024 * 1024 * 1024) { // 4GB
    throw new Error('Storage limit reached. Please delete old files.');
  }
  
  // 4. Proceed with upload
  return await uploadFile(file, lessonId);
}
```

## Summary

**Critical Actions:**
1. ✅ Set billing alerts at $1, $5, $10
2. ✅ Set storage quota to 4 GB (80% of limit)
3. ✅ Reduce max file size to 10MB in code
4. ✅ Check usage weekly
5. ✅ Communicate limits to team

**With these precautions, you should stay well within the free tier!**

