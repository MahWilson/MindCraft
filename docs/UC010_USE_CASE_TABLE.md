# UC010: Assess Student Work - Use Case Table

## Use Case Overview

**Use Case**: Assess Student Work  
**ID**: UC010  
**Actors**: Teacher  
**Preconditions**: 
- Teacher is logged into MindCraft
- Teacher has access to at least one course with assessments or assignments
- Students have submitted work for assessment

---

## Feature Implementation Table

| Feature ID | Feature Description | Main Flow Step | Status | Implementation Location | Notes |
|------------|---------------------|----------------|--------|------------------------|-------|
| **F001** | Navigate to submissions page | 1 | ✅ Complete | `app/assessments/[id]/submissions/page.jsx`, `app/assignments/[id]/submissions/page.jsx` | Teachers access via assessment/assignment pages |
| **F002** | Retrieve student submissions | 2 | ✅ Complete | Submission listing pages | Loads all submissions with student info |
| **F003** | View submission files (PDF, DOCX, XLSX, SQL, ZIP) | 3 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | File download with format support |
| **F004** | View assessment answers (text, code, multiple choice) | 3 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Full answer display with question pairs |
| **F005** | Filter submissions by student name | 4 | ✅ Complete | Submission listing pages | Search functionality implemented |
| **F006** | Filter submissions by status (Submitted/Late) | 4 | ✅ Complete | Submission listing pages | Status filter dropdown |
| **F007** | Filter submissions by date | 4 | ✅ Complete | Submission listing pages | Date filter: Today, Past Week, Past Month, All |
| **F008** | Update submission status to Reviewed | 5 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Auto-updates when teacher views submission |
| **F009** | View submission timestamp | 5 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Full date/time display |
| **F010** | View attempt number | 5 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Calculated and displayed |
| **F011** | View late status indicator | 5 | ✅ Complete | Submission listing and grading pages | Visual badges for Late/On Time |
| **F012** | Navigate to grading page | 1 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Accessible from submission list |
| **F013** | Input written feedback | 2 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | RichTextEditor with formatting |
| **F014** | Input numerical grade | 2 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Grade input with validation |
| **F015** | Auto-save draft feedback | 2 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Auto-saves after 2 seconds of inactivity |
| **F016** | Control release of results | 3 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Release button with validation |
| **F017** | Modify existing evaluations | 4 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | allowRegrading checkbox |
| **F018** | Automatic student notification | 5 | ✅ Complete | `app/api/submissions/[id]/release/route.js` | Notification created on release |
| **F019** | Handle file corruption errors | A1 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Error detection and user-friendly messages |
| **F020** | Handle insufficient grading data | A2 | ✅ Complete | `app/submissions/[id]/grade/page.jsx` | Validation before release |
| **F021** | Handle system errors | E1 | ✅ Complete | All submission pages | System error handling with recovery options |

---

## Main Flow Features

### 1. Review Student Submission (US010-01) - ✅ 100% Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | Teacher navigates to submissions | Assessment/Assignment submission pages |
| 2 | System retrieves submissions | Loads all submissions with student data |
| 3 | Teacher views submission content | File download or answer display |
| 4 | Teacher filters submissions | Search, status, and date filters |
| 5 | System updates status to Reviewed | Auto-updates when teacher views |

### 2. Provide Feedback and Grade (US010-02) - ✅ 100% Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | Teacher navigates to grading page | From submission list |
| 2 | Teacher inputs feedback and grade | RichTextEditor and grade input |
| 3 | Teacher releases results | Release button with validation |
| 4 | Teacher modifies if needed | allowRegrading functionality |
| 5 | System notifies student | Automatic notification on release |

---

## Alternative Flow Features

### A1: File Corruption Error - ✅ Complete
- Error detection during file download
- User-friendly error messages
- Graceful handling without breaking workflow

### A2: Insufficient Grading Data - ✅ Complete
- Validation ensures grade or feedback before release
- Clear error messages
- Prevents incomplete releases

---

## Exception Flow Features

### E1: System Error - ✅ Complete
- Comprehensive error handling
- User-friendly error messages
- Recovery options (reload, retry)

---

## Acceptance Criteria Status

### US010-01: Review Student Submission - ✅ 100% Complete
- ✅ View assignment files (all formats)
- ✅ View assessment answers
- ✅ Filter by student name, status, date
- ✅ Update submission status
- ✅ View timestamp and attempt number
- ✅ Late status indicator

### US010-02: Provide Feedback and Grade - ✅ 100% Complete
- ✅ Input written comments
- ✅ Input numerical marks
- ✅ Control release of results
- ✅ Modify existing evaluations
- ✅ Automatic student notification

---

## Implementation Summary

**Overall Completion**: ✅ **100% Complete**

### Files Modified:
1. `app/submissions/[id]/grade/page.jsx` - Core grading interface
2. `app/assessments/[id]/submissions/page.jsx` - Assessment submission listing
3. `app/assignments/[id]/submissions/page.jsx` - Assignment submission listing
4. `app/assignments/[id]/submit/page.jsx` - File type support
5. `app/api/submissions/[id]/grade/route.js` - Auto-save API
6. `app/api/submissions/[id]/release/route.js` - Release API

---

**Last Updated**: 2024-12-19  
**Status**: All features fully implemented and tested ✅

