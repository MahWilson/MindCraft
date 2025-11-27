# Enhanced Forum Schema - Reddit-Style Discussion System

This document describes the updated Firestore collections and document structure for the enhanced Reddit-style forum system designed for elementary school coding academy.

## Overview

The forum has been enhanced with Reddit-style features including:
- Nested comment threads (students can reply to other students)
- Upvote/downvote system (without karma)
- School-appropriate UI with friendly colors and language
- Real-time updates using Firestore snapshots

## Collections

### `posts` (forum discussions)
Each document represents a top-level discussion post.

Fields:
- `title` (string) — Post title.
- `content` (string) — Post body/HTML or plain text.
- `authorId` (string) — UID of the author.
- `authorName` (string) — Display name of the author.
- `role` (string) — Author role, e.g. `student` or `teacher`.
- `createdAt` (Firestore Timestamp) — Server timestamp when created.
- `isPinned` (boolean) — Whether the post is pinned by a teacher.
- `reactions` (map) — Map of `{ [userId]: emoji }` to track per-user reaction.
- `replies` (array) — Array of enhanced reply objects with nested support.
- `votes` (object) — Map of `{ [userId]: 'upvote' | 'downvote' }` for Reddit-style voting.
- `score` (number) — Total score from votes (upvotes - downvotes).

Enhanced Reply object shape (in `replies` array):
- `id` (string) — Unique reply ID
- `authorId` (string)
- `authorName` (string)
- `content` (string)
- `createdAt` (Firestore Timestamp)
- `votes` (object) — Map of user votes for this reply
- `score` (number) — Reply score from votes
- `parentReplyId` (string|null) — Parent reply ID for nested replies
- `replies` (array) — Nested replies (recursive structure)
- `editedAt` (Firestore Timestamp|null) — When the reply was last edited

### `audit_logs`
Used for moderation/audit. Each document logs moderation actions like deletions.

Fields:
- `action` (string) — e.g., `DELETE_POST`, `DELETE_REPLY`.
- `postId` (string) — ID of the post affected.
- `replyId` (string|null) — ID of the reply affected (if applicable).
- `deletedContent` (object) — Snapshot of the deleted content.
- `deletedBy` (string) — UID of the moderator.
- `reason` (string) — Optional reason provided for the deletion.
- `timestamp` (Firestore Timestamp) — When the action happened.

## API Endpoints

### Create Post
```js
await fetch('/api/forum/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'How to approach Module 7?',
    content: 'Here are my thoughts...',
    authorId: user.uid,
    authorName: user.displayName,
    role: userData.role // 'student' or 'teacher'
  })
});
```

### Vote on Post/Reply (Reddit-style)
```js
await fetch('/api/forum/vote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: 'post_id_here',
    replyId: 'reply_id_here', // Optional, omit for post voting
    userId: user.uid,
    voteType: 'upvote' // or 'downvote'
  })
});
```

### Create Reply (with nesting support)
```js
await fetch('/api/forum/reply-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: 'post_id_here',
    authorId: user.uid,
    authorName: user.displayName,
    content: 'My reply content...',
    parentReplyId: 'parent_reply_id' // Optional, for nested replies
  })
});
```

### Delete Reply
```js
await fetch('/api/forum/reply-enhanced', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: 'post_id_here',
    replyId: 'reply_id_here',
    userId: user.uid,
    userRole: userData.role,
    reason: 'Optional reason for deletion'
  })
});
```

### Edit Reply
```js
await fetch('/api/forum/reply-enhanced', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: 'post_id_here',
    replyId: 'reply_id_here',
    userId: user.uid,
    content: 'Updated reply content...'
  })
});
```

## School-Appropriate Features

1. **No Karma System**: Removed all karma-related functionality as it's inappropriate for elementary school
2. **Friendly UI**: 
   - Blue color scheme with friendly styling
   - Role badges use emojis (👩‍🏫 Teacher, 👨‍🎓 Student)
   - Score displayed as "likes" instead of "points" or "karma"
3. **Safe Environment**: Teachers can moderate content with audit logs
4. **Simple Sorting**: Only "Recent" and "Popular" (based on reactions) sorting options

## Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }

    match /audit_logs/{logId} {
      allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

## Migration Notes

The enhanced system maintains backward compatibility with existing posts. Old posts will:
- Display with score of 0 (no votes)
- Show existing replies in the old format
- Work with the new voting system when users interact with them

New features (voting, nested replies) will only be available for posts created after the enhancement.

---

The forum is now ready for elementary school students to engage in Reddit-style discussions while maintaining a safe and appropriate learning environment.