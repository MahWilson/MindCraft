# Firebase Collection Templates

## 1. POSTS Collection Template

Copy this JSON and paste it when creating your first post document in Firebase:

```json
{
  "title": "Welcome to our Class Discussion Forum! 🎉",
  "content": "Hey everyone! This is our new space to ask questions, share projects, and help each other learn coding. Feel free to start discussions about anything you're working on or need help with!",
  "authorId": "teacher-user-id-here",
  "authorName": "Mrs. Smith",
  "role": "teacher",
  "createdAt": "__timestamp__",
  "isPinned": true,
  "reactions": {},
  "replies": [],
  "votes": {},
  "score": 0
}
```

**How to add in Firebase Console:**
1. Go to Firestore Database
2. Click "Start collection"
3. Collection ID: `posts`
4. Document ID: Click "Auto-ID"
5. Paste the JSON above
6. For `createdAt`, click the field type dropdown and select "Timestamp", then click the server timestamp button

## 2. AUDIT_LOGS Collection Template

Copy this JSON for your first audit log:

```json
{
  "action": "DELETE_REPLY",
  "postId": "post-id-here",
  "replyId": "reply-id-here",
  "deletedBy": "teacher-user-id-here",
  "reason": "Inappropriate language",
  "timestamp": "__timestamp__",
  "deletedContent": {
    "authorId": "student-user-id",
    "authorName": "John Doe",
    "content": "This was the deleted reply content",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

**How to add in Firebase Console:**
1. Click "Start collection" again
2. Collection ID: `audit_logs`
3. Document ID: Click "Auto-ID"
4. Paste the JSON above
5. For `timestamp`, select "Timestamp" type and server timestamp

## 3. Quick Setup Steps

### Option A: Manual Creation (Recommended)
1. **Create posts collection first** with the template above
2. **Create audit_logs collection** with the template above
3. **Update security rules** (copy from the documentation I provided)

### Option B: Let the App Create Them Automatically
Just use the forum normally - when you:
- Create your first post → Firebase will auto-create the `posts` collection
- Delete something → Firebase will auto-create the `audit_logs` collection

## 4. Test It Right Now

Go to your browser and visit: `http://localhost:3003/forum`

Try creating a discussion - it will automatically create the collections if they don't exist!

**Note:** Replace "teacher-user-id-here" with your actual teacher user ID from your Firebase Authentication users.