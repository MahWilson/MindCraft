# Assessment Configuration - Quick Start Guide

## 🎯 Quick Navigation

### For Teachers: Configure an Assessment
1. Go to **Dashboard** → **Assessments**
2. Click the ⚙️ **Configure** button on any assessment
3. You'll see 4 configuration tabs:
   - 📊 **Grading** - Set marks, weightage, rubrics
   - 📅 **Availability** - Set start/end dates and times
   - 👥 **Student Access** - Configure attempts and access modes
   - 🔔 **Notifications** - Setup reminders and alerts

---

## 📊 Tab 1: Grading Configuration

### What it does
Defines how the assessment will be graded and scored.

### Setup Steps

1. **Set Total Marks** (required)
   - Default: 100
   - Range: 1-1000
   - This is the maximum possible score

2. **Set Passing Marks** (required)
   - Default: 40
   - Must be ≤ Total Marks
   - System shows passing percentage automatically

3. **Add Weightage Rules** (optional)
   - Click "Add Criterion" button
   - Example: `Code Quality (30%), Accuracy (40%), Comments (30%)`
   - Weights must sum to 100% if you use them
   - Delete rules by clicking the trash icon

4. **Add Rubrics** (optional)
   - Click "Add Rubric" button
   - For each criterion, define 4 levels:
     - **Excellent** - Best work quality (green)
     - **Good** - Above average (blue)
     - **Satisfactory** - Meets requirements (orange)
     - **Poor** - Below requirements (red)
   - Teachers use these when grading assignments

### Example Configuration
```
Total Marks: 100
Passing Marks: 50 (50%)

Weightage:
├─ Code Quality: 40%
├─ Correctness: 40%
└─ Documentation: 20%

Rubrics:
├─ Code Quality
│  ├─ Excellent: Well-organized, follows best practices
│  ├─ Good: Mostly organized, some good practices
│  ├─ Satisfactory: Basic structure, needs improvement
│  └─ Poor: Disorganized, hard to read
└─ Correctness
   ├─ Excellent: All test cases pass
   ├─ Good: 95% test cases pass
   ├─ Satisfactory: 80% test cases pass
   └─ Poor: Less than 80% pass
```

###💾 Save
Click **"Save Grading Configuration"** to save your changes.

---

## 📅 Tab 2: Availability Configuration

### What it does
Controls when students can see and submit the assessment.

### Setup Steps

1. **Set Start Date & Time**
   - Pick the date assessment becomes available
   - Pick the time (defaults to 00:00)
   - Students cannot access before this time

2. **Set End Date & Time**
   - Pick the deadline date
   - Pick the time (defaults to 23:59)
   - Students cannot submit after this time

3. **Optional: Set Duration**
   - How many minutes students have to complete assessment
   - Once time expires, assessment auto-closes
   - Leave empty if using deadline instead

4. **Show Duration to Students**
   - Toggle ON to show countdown timer
   - Toggle OFF to hide time from students

5. **Auto-Unavailable**
   - Toggle ON (recommended) to automatically hide assessment after deadline
   - Students won't see it in their course list after deadline passes

### Example Configuration
```
Start Date: 2025-01-15
Start Time: 10:00 AM
End Date: 2025-01-16
End Time: 10:00 PM
Duration: 60 minutes (optional)
Show Duration: Yes ✓
Auto-Unavailable: Yes ✓
```

**What happens:**
- Jan 15 at 10:00 AM: Assessment appears
- Jan 16 at 10:00 PM: Deadline arrives, submissions blocked
- Jan 16 at 10:01 PM: Assessment disappears from student view

### 💾 Save
Click **"Save Availability Settings"** to save your changes.

---

## 👥 Tab 3: Student Access Control

### What it does
Controls how students interact with the assessment.

### Setup Steps

1. **Choose Access Mode**
   - **Online Only** (default)
     - Must complete on platform
     - Must submit before deadline
   - **Offline**
     - Can download and work offline
     - Can submit later
   - **Disabled**
     - Students cannot access (emergency disable)

2. **Allow Multiple Attempts**
   - Toggle OFF: Students get only 1 attempt (default)
   - Toggle ON: Students can retry the assessment

3. **Set Maximum Attempts** (if multiple attempts enabled)
   - Default: 1
   - Range: 1-10
   - System tracks attempts automatically

### Example Configurations

**High-Stakes Quiz (1 attempt)**
```
Access Mode: Online Only
Multiple Attempts: OFF
Max Attempts: 1
```

**Practice Quiz (unlimited attempts)**
```
Access Mode: Online Only
Multiple Attempts: ON
Max Attempts: 10
```

**Flexible Assignment**
```
Access Mode: Offline
Multiple Attempts: ON
Max Attempts: 3
```

### 💾 Save
Click **"Save Access Settings"** to save your changes.

---

## 🔔 Tab 4: Notifications & Reminders

### What it does
Sends students alerts about assessment deadlines and availability.

### Setup Steps

1. **Enable Deadline Reminder**
   - Toggle ON to send reminder before deadline
   - Set hours before deadline (default: 24 hours)
   - Example: Set to "24" = reminder 1 day before deadline

2. **Send Start Notification**
   - Toggle ON to notify students when assessment goes live
   - Sends at start date/time

3. **View Summary**
   - Shows all configured notifications
   - Helps you verify settings before saving

### Notification Examples

```
Student gets 3 types of notifications:
1. On Start: "Assessment 'Module 1 Quiz' is now available"
2. Reminder: "Reminder: Assessment 'Module 1 Quiz' is due in 24 hours"
3. On Close: "Assessment 'Module 1 Quiz' is now closed"
```

### 💾 Save
Click **"Save Notification Settings"** to save your changes.

---

## 🔄 Complete Configuration Workflow

### Step 1: Create Assessment
```
Dashboard → Assessments → Create Assessment
Add questions, select course, choose type
```

### Step 2: Configure Settings
```
Assessments → Configure (⚙️ button)
├─ Grading: Set marks & rubrics
├─ Availability: Set dates & times
├─ Access: Set attempts
└─ Notifications: Enable reminders
```

### Step 3: Publish
```
Assessments → Edit (✏️ button)
Check "Publish immediately"
Click "Update & Publish"
```

### Step 4: Monitor
```
Dashboard → Assessments
See configuration in each assessment card:
✓ Marks shown
✓ Time limits shown
✓ Attempts shown
```

---

## ⚠️ Common Issues & Solutions

### "Students can't see assessment"
- [ ] Check if published (look for green "Published" badge)
- [ ] Check start date hasn't passed
- [ ] Check student access mode is "Online" or "Offline"

### "Students can't submit after deadline"
- [ ] This is expected! It's a security feature
- [ ] Check "Allow Extension" button in edit page
- [ ] Or extend deadline in configuration

### "Deadline reminder not sent"
- [ ] Check if reminders are enabled (🔔 tab)
- [ ] Check time is set correctly (hours before deadline)
- [ ] Reminders send automatically when deadline approaches

### "Assessment disappeared"
- [ ] Check "Auto-Unavailable" is OFF if you want it visible
- [ ] Or extend the end date/time
- [ ] Re-publish if needed

---

## 📈 Best Practices

### For Quizzes
```
✓ Set exact deadline (no grace period)
✓ Allow 1-2 attempts (not unlimited)
✓ Show time remaining (helps pacing)
✓ Send 24-hour reminder (advance notice)
✓ Online-only mode (prevents cheating)
```

### For Assignments
```
✓ Set longer deadline (2-3 days)
✓ Allow offline mode (longer work)
✓ Allow 1 final attempt (revision chance)
✓ Higher passing marks (quality focus)
✓ Use rubrics (clear grading standards)
```

### For Practice Assessments
```
✓ No deadline (always open)
✓ Allow unlimited attempts
✓ Offline mode if available
✓ Low passing marks (encourages tries)
✓ Show results immediately (learning feedback)
✓ No notifications (low pressure)
```

---

## 🎓 Testing Your Configuration

### Test 1: Can students access?
1. Create assessment with tomorrow's start date
2. Try to access as student
3. Should see: "Assessment not available yet"
4. Change to past date
5. Should now see assessment

### Test 2: Can students submit?
1. Create assessment with deadline 1 hour away
2. Take assessment as student
3. Should be able to submit
4. Wait until after deadline
5. Try to submit again
6. Should see: "Deadline has passed"

### Test 3: Do notifications work?
1. Enable deadline reminder (0 hours = immediately)
2. Check notifications appear in student profile
3. Verify message is correct

### Test 4: Attempt limits
1. Set max 2 attempts
2. Take assessment twice as student
3. Try to take 3rd time
4. Should see: "Maximum attempts reached"

---

## 📞 Need Help?

### For Teachers
- Check `ASSESSMENT_CONFIGURATION.md` for technical details
- Check `IMPLEMENTATION_SUMMARY_US006_02.md` for all features

### For Developers
- API endpoints in `/api/assessments/[id]/config`
- Components in `/app/assessments/configure/`
- Utilities in `/lib/utils.js`

---

**Happy Grading! 🎉**
