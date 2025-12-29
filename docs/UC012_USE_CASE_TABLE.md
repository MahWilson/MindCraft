# UC012: Learning Risk Monitoring - Use Case Table

## Use Case Overview

**Use Case**: Learning Risk Monitoring  
**ID**: UC012  
**Actors**: Student, Teacher  
**Preconditions**: 
- User (Student or Teacher) is logged into MindCraft
- User has access to at least one active course
- System contains assessment, assignment, attendance, and activity data

---

## Feature Implementation Table

| Feature ID | Feature Description | Main Flow Step | Status | Implementation Location | Notes |
|------------|---------------------|----------------|--------|------------------------|-------|
| **F001** | Navigate to learning risk monitor (Teacher) | 1 | ✅ Complete | `app/analytics/page.jsx` | Teachers access via `/analytics` page |
| **F002** | Retrieve class learning data (scores, completion rate, attendance, activity) | 2 | ✅ Complete | `app/analytics/page.jsx` (loadAnalytics function) | Retrieves submissions, enrollments, and calculates metrics |
| **F003** | Analyze data using predefined risk rules | 3 | ✅ Complete | `app/analytics/page.jsx` (lines 482-533) | Risk assessment with configurable thresholds (minAvgScore: 60%, maxMissedDeadlines: 2, maxDaysInactive: 7) |
| **F004** | Identify students with low/medium/high learning risk | 4 | ✅ Complete | `app/analytics/page.jsx` (lines 505-510) | Risk levels calculated based on score, deadline, and engagement factors |
| **F005** | Display list of at-risk students with risk levels | 5 | ✅ Complete | `app/analytics/page.jsx` (lines 1026-1111) | At-risk students displayed in card format with risk level badges and detailed metrics |
| **F006** | Navigate to learning risk monitor (Student) | 1 | ✅ Complete | `app/progress/page.jsx` | Students access via `/progress` page |
| **F007** | Retrieve student's learning and engagement data | 2 | ✅ Complete | `app/progress/page.jsx` (loadProgress function) | Retrieves submissions, enrollments, and calculates individual metrics |
| **F008** | Evaluate data against learning risk thresholds | 3 | ✅ Complete | `app/progress/page.jsx` (evaluateLearningRisk function) | Uses same risk thresholds as teacher analytics |
| **F009** | Display student's risk indicator (low/medium/high) | 4 | ✅ Complete | `app/progress/page.jsx` (lines 825-890) | Risk indicator card displayed prominently on progress page |
| **F010** | Show contributing risk factors (low scores, missed deadlines, low activity) | 5 | ✅ Complete | `app/progress/page.jsx` (evaluateLearningRisk function) | Risk factors displayed as list items in risk indicator card |
| **F011** | Detect student's risk level exceeds threshold | 1 | ✅ Complete | `app/progress/page.jsx` (evaluateLearningRisk function) | Automatic detection when risk level is medium or high |
| **F012** | Generate notification with risk status and explanation | 2 | ✅ Complete | `app/progress/page.jsx` (sendRiskNotification function) | Creates notification document in Firestore with risk details |
| **F013** | Send notification to student (dashboard alert) | 3 | ✅ Complete | `app/progress/page.jsx` (sendRiskNotification function) | Notification stored in `notification` collection, visible in dashboard |
| **F014** | Teacher add guidance/recommendations (optional) | 4 | ⚠️ Partial | N/A | Notification system supports custom messages, but teacher UI for adding guidance not yet implemented |
| **F015** | Handle insufficient data scenario | A1 | ✅ Complete | `app/progress/page.jsx` (evaluateLearningRisk function) | Displays "Insufficient data to assess learning risk" message when no submissions or enrollments |
| **F016** | Handle risk analytics retrieval failure | A2 | ✅ Complete | `app/analytics/page.jsx`, `app/progress/page.jsx` | System error handling displays "Unable to load learning risk data. Please try again later." |
| **F017** | Handle system error during risk processing | E1 | ✅ Complete | `app/analytics/page.jsx`, `app/progress/page.jsx` | Error handling with systemError flag, displays "An unexpected error occurred. Please reload the page." |

---

## Main Flow Features

### 1. Identify At-Risk Student (Teacher) - ✅ 100% Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | Teacher navigates to analytics page | `/analytics` route accessible to teachers |
| 2 | System retrieves class learning data | `loadAnalytics()` function retrieves submissions, enrollments, assessments, assignments |
| 3 | System analyzes data using risk rules | Risk calculation logic (lines 482-533) with configurable thresholds |
| 4 | System identifies risk levels | Risk levels: low, medium, high based on score, deadline, and engagement factors |
| 5 | System displays at-risk students list | At-risk students card (lines 1026-1111) with risk level badges, metrics, and reasons |

### 2. View Risk Indicator (Student) - ✅ 100% Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | Student navigates to progress page | `/progress` route accessible to students |
| 2 | System retrieves student's learning data | `loadProgress()` function retrieves submissions and enrollments |
| 3 | System evaluates data against thresholds | `evaluateLearningRisk()` function calculates risk based on same thresholds as teacher view |
| 4 | System displays risk indicator | Risk indicator card (lines 825-890) shows low/medium/high status |
| 5 | System shows contributing risk factors | Risk factors displayed as list items (low scores, missed deadlines, low activity) |

### 3. Notify At-Risk Student (Teacher) - ✅ 95% Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | System detects risk level exceeds threshold | Automatic detection in `evaluateLearningRisk()` when risk is medium or high |
| 2 | System generates notification | `sendRiskNotification()` creates notification document with risk status and factors |
| 3 | System sends notification to student | Notification stored in Firestore `notification` collection, visible in dashboard |
| 4 | Teacher add guidance (optional) | ⚠️ Notification system supports custom messages, but teacher UI for adding guidance not yet implemented |

---

## Alternative Flow Features

### A1: Insufficient Data for Risk Analysis - ✅ Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | System detects insufficient data | Check in `evaluateLearningRisk()`: `if (submissions.length === 0 && progressData.length === 0)` |
| 2 | System displays message | Displays: "Insufficient data to assess learning risk." (BM: "Data tidak mencukupi untuk menilai risiko pembelajaran.") |

### A2: Risk Analytics Retrieval Failure - ✅ Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | System fails to retrieve analytics | Error handling in `loadAnalytics()` and `loadProgress()` functions |
| 2 | System displays error message | Displays: "Unable to load learning risk data. Please try again later." (BM: "Tidak dapat memuatkan data kemajuan. Sila cuba lagi kemudian.") |
| 3 | User remains on current page | Error state handled, page remains accessible |

---

## Exception Flow Features

### E1: System Error During Risk Processing - ✅ Complete

| Step | Feature | Implementation |
|------|---------|----------------|
| 1 | System error occurs | Error handling in try-catch blocks |
| 2 | System displays error message | Displays: "An unexpected error occurred. Please reload the page." (BM: "Ralat sistem yang tidak dijangka berlaku. Sila muat semula atau cuba lagi kemudian.") |
| 3 | Risk evaluation terminated | Error caught, evaluation stops gracefully |

---

## Risk Assessment Criteria

The system uses the following configurable thresholds for risk assessment:

- **Minimum Average Score**: 60% (default)
  - High Risk: < 50%
  - Medium Risk: 50-60%
  - Low Risk: > 60%

- **Maximum Missed Deadlines**: 2 (default)
  - High Risk: > 2 missed deadlines
  - Medium Risk: 1-2 missed deadlines
  - Low Risk: 0 missed deadlines

- **Maximum Days Inactive**: 7 days (default)
  - High Risk: > 14 days inactive
  - Medium Risk: 7-14 days inactive
  - Low Risk: < 7 days inactive

**Final Risk Level**: Determined by the highest individual risk factor (high > medium > low)

---

## Notification System

### Notification Types
- **Type**: `learning_risk`
- **Frequency**: Maximum once per 24 hours per student
- **Content**: Risk level, contributing factors, improvement suggestions

### Notification Storage
- **Collection**: `notification` (Firestore)
- **Fields**: `userId`, `type`, `title`, `message`, `read`, `createdAt`
- **Visibility**: Dashboard alerts, notification center

---

## Postconditions

✅ **All Postconditions Met**:
1. At-risk students are identified correctly based on learning data
2. Students can view their current learning risk indicators
3. Notifications are successfully delivered to at-risk students (via dashboard alerts)

---

## Implementation Summary

**Overall Completion**: ✅ **98% Complete**

### Completed Features:
- ✅ Teacher at-risk student identification
- ✅ Student risk indicator display
- ✅ Automatic risk notifications
- ✅ Insufficient data handling
- ✅ Error handling for retrieval failures
- ✅ System error handling

### Partially Completed:
- ⚠️ Teacher guidance/recommendations UI (notification system supports it, but UI not implemented)

### Files Modified:
1. `app/analytics/page.jsx` - Teacher risk monitoring
2. `app/progress/page.jsx` - Student risk indicator and notifications
3. `docs/UC012_USE_CASE_TABLE.md` - This document

---

**Last Updated**: 2024-12-19  
**Status**: Use case fully implemented with minor enhancement opportunity (teacher guidance UI)

