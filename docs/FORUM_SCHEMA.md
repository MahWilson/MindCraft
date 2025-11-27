# Forum Schema

This document describes the Firestore collections and document structure used by the Forum (Module 7).

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
- `replies` (array) — Array of reply objects (see below). Optional; can be kept small or moved to a subcollection if you expect many replies.

Reply object shape (in `replies` array):
- `authorId` (string)
- `authorName` (string)
- `content` (string)
- `createdAt` (Firestore Timestamp)

Notes:
- For large-scale apps, consider using a subcollection `posts/{postId}/replies/{replyId}` instead of an array.
- Reactions are stored as a map to make it simple to enforce "one reaction per user" behavior.

### `audit_logs`
Used for moderation/audit. Each document logs moderation actions like deletions.

Fields:
- `action` (string) — e.g., `DELETE_POST`.
- `deletedPostId` (string) — ID of the post deleted.
- `deletedContent` (object) — Snapshot of the deleted post (or the `content` field).
- `deletedBy` (string) — UID of the moderator.
- `timestamp` (Firestore Timestamp) — When the action happened.

## Example: Create a Post (client-side)

This is the same shape used by `app/api/forum/create/route.js` in this repo. Example `fetch` call from the client:

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

## Example: Delete a Post (teacher only)

Teacher should call:

```js
await fetch('/api/forum/delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ postId, userId: user.uid, userRole: userData.role })
});
```

The API route will write an entry into `audit_logs` before removing the post.

## Firestore Security Rules (recommended)

Add these rules to restrict writes/edits to teachers for moderation actions. Make sure your `users` collection stores the user role at `users/{uid}.role`.

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

## Migration notes
- If you previously used a different collection name (e.g., `forum_posts`), migrate documents to `posts` or update the client and API to use the same collection.
- For replies migration, if replies were stored differently, use a migration script to normalize to the new `replies` array or to the new `replies` subcollection.

---
If you'd like, I can:
- Add an automated migration script that moves `forum_posts` → `posts` if documents exist.
- Move replies into a `replies` subcollection and update the UI to page through replies.
- Convert server API routes to use the Firebase Admin SDK for safer server-side writes.
