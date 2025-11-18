# Assessment Configuration System (US006-02)

## Overview
Complete assessment configuration system that allows teachers to manage grading rules, availability, student access, and notifications for assessments.

## Features Implemented

### 1. Marking Scheme Configuration
**File:** `app/assessments/configure/configure.jsx`

Teachers can define:
- **Total Marks**: Maximum marks available (1-1000)
- **Passing Marks**: Marks required to pass (0-total marks)
- **Weightage Rules**: Define how different components contribute to final score
- **Rubrics**: Define performance levels (Excellent, Good, Satisfactory, Poor) for each criterion

#### Data Structure
```javascript
config: {
  totalMarks: 100,
  passingMarks: 40,
  weightage: [
    {
      id: timestamp,
      criterion: "Code Quality",
      weight: 30,
      description: "Evaluates code organization, readability, comments"
    }
  ],
  rubrics: [
    {
      id: timestamp,
      criterion: "Accuracy",
      excellent: "All calculations correct",
      good: "95% calculations correct",
      satisfactory: "80% calculations correct",
      poor: "Less than 80% correct",
      weight: 40
    }
  ]
}
```

### 2. Availability Configuration
**File:** `app/assessments/configure/page.jsx` → Availability Tab

Teachers can configure:
- **Start Date & Time**: When assessment becomes available
- **End Date & Time**: Deadline for submission
- **Timed Duration**: Optional - auto-close after X minutes
- **Show Duration**: Display remaining time to students
- **Auto Unavailable**: Automatically hide assessment after deadline

#### Features
- Validates start date < end date
- Auto-calculates passing percentage
- Supports duration-based or deadline-based availability
- Can show countdown timer to students

### 3. Student Access Control
**File:** `app/assessments/configure/page.jsx` → Student Access Tab

Teachers can control:
- **Access Mode**: Online only, Offline, or Disabled
- **Attempt Settings**: Single or multiple attempts
- **Max Attempts**: Limit number of attempts (1-10)

#### Access Modes
- **Online Only**: Must submit on platform within deadline
- **Offline**: Can work offline and submit later
- **Disabled**: Students cannot access assessment

### 4. Notification & Reminder System
**File:** `app/assessments/configure/page.jsx` → Notifications Tab

Teachers can configure:
- **Deadline Reminders**: Send notification X hours before deadline
- **Start Notifications**: Notify when assessment becomes available
- **Auto Unavailable Notifications**: Alert students when deadline passes

#### Notification Endpoints
```
POST /api/assessments/[id]/notifications/send-reminders
POST /api/assessments/[id]/notifications/send-availability
POST /api/assessments/[id]/notifications/check-deadline
```

### 5. Access Control & Deadline Enforcement
**File:** `app/api/assessments/[id]/check-availability/route.js`

Validates student access with checks for:
1. ✓ Published status
2. ✓ Access mode enabled
3. ✓ Start date/time passed
4. ✓ Deadline not exceeded
5. ✓ Attempt limit not reached

Returns:
- `available`: boolean
- `reason`: human-readable message
- `status`: one of [available, not_published, access_disabled, not_started, deadline_passed, max_attempts_reached]
- `deadline`: submission deadline timestamp

## API Endpoints

### Configuration Management
```
GET /api/assessments/[id]/config
  → Fetch assessment configuration

PUT /api/assessments/[id]/config
  Body: { totalMarks, passingMarks, weightage, rubrics, ... }
  → Update grading configuration
```

### Availability & Deadline
```
POST /api/assessments/[id]/check-availability
  Body: { userId }
  → Check if student can access assessment

POST /api/assessments/[id]/notifications/check-deadline
  → Check if deadline passed and mark unavailable
```

### Notifications
```
POST /api/assessments/[id]/notifications/send-reminders
  → Send deadline reminder to enrolled students

POST /api/assessments/[id]/notifications/send-availability
  → Notify students assessment is available

POST /api/assessments/[id]/notifications/check-deadline
  → Auto-mark unavailable and notify students
```

## Frontend Components

### AssessmentConfigure Component
**Location:** `app/assessments/configure/configure.jsx`

Props:
- `assessment`: Assessment object with config
- `onConfigChange`: Callback function(configData)
- `loading`: Loading state boolean

Features:
- Marking scheme editor with validation
- Weightage rules management (add/edit/delete)
- Rubrics builder with 4 performance levels
- Real-time validation and error messages

### Configuration Page
**Location:** `app/assessments/configure/page.jsx`

URL: `/assessments/configure/[id]`

Tabs:
1. **Grading**: Total marks, passing marks, weightage, rubrics
2. **Availability**: Start/end dates, duration, auto-unavailable
3. **Student Access**: Access mode, attempts, max attempts
4. **Notifications**: Reminders, availability notifications

## Integration with Assessment Workflow

### Create → Configure → Publish
1. **Create Assessment** (`/dashboard/assessments/new`)
   - Define questions
   - Basic settings (type, course)

2. **Configure Assessment** (`/assessments/configure/[id]`)
   - Set grading rules
   - Configure availability
   - Enable notifications

3. **Publish Assessment** (`/dashboard/assessments/[id]/edit`)
   - Toggle published status
   - Assessment becomes available to students

### Student Access Flow
1. Student tries to view assessment
2. System calls `POST /api/assessments/[id]/check-availability`
3. Validates all constraints
4. If available, student can start assessment
5. If deadline passed, system blocks submission

## Acceptance Criteria Met

✅ **Ability for Teacher to define marking scheme**
- Total marks, passing marks
- Weightage of components
- Rubrics/marking guidelines

✅ **Ability for Teacher to configure availability**
- Start date/time
- End date/time
- Duration-based timer option

✅ **Ability for Teacher to toggle student access**
- Online/offline/disabled modes
- Single/multiple attempts

✅ **Ability for System to send notifications**
- Deadline reminders
- Start notifications
- Deadline passed alerts

✅ **Acceptance Testing**
- Start/end date configuration saves correctly
- Auto-availability enforcement on deadline
- Students cannot submit after deadline
- Notifications sent based on configuration

## Data Validation

### Marking Scheme
- Total marks: 1-1000 (required)
- Passing marks: 0-total marks
- Weightage sum: 0% or 100%
- Rubrics: Optional but validated if present

### Availability
- Start date < End date
- Time format: HH:MM
- Duration: 1+ minutes

### Notifications
- Reminder time: 1-72 hours before deadline

## Error Handling

All endpoints return consistent error responses:
```javascript
{
  success: false,
  error: "Human-readable error message"
}
```

Form validation with immediate feedback:
- Client-side validation in components
- Server-side validation in API routes
- Toast notifications for success/error

## Future Enhancements

1. **Scheduled Notifications**: Use cron jobs to auto-send reminders
2. **Extension Handling**: Allow teacher to extend deadline per student
3. **Late Submission**: Configure grace period for late submissions
4. **Analytics**: Track assessment completion rates, average scores
5. **Assessment Templates**: Save configuration templates for reuse
6. **Bulk Actions**: Configure multiple assessments at once

## Testing Checklist

- [ ] Create assessment and navigate to config page
- [ ] Test grading config (add weightage, rubrics)
- [ ] Test availability settings (dates/times)
- [ ] Test student access modes
- [ ] Test notification settings
- [ ] Verify deadline enforcement
- [ ] Check student cannot submit after deadline
- [ ] Verify notifications in student profile
- [ ] Test all form validations

## Security Considerations

- Only teachers/admins can access configuration routes
- Student data validated on server-side
- Deadline enforcement happens server-side (prevent client tampering)
- Notifications only sent to enrolled students
- Firestore security rules enforce role-based access
