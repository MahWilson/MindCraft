# Firebase Storage Setup

## Security Rules for Profile Pictures

To enable profile picture uploads, you need to configure Firebase Storage security rules.

### Step 1: Go to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mindcraft-f14ac`
3. Click on **Storage** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Add Security Rules

Replace the default rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile pictures: users can upload/read their own, admins can read any
    match /profile-pictures/{userId}/{allPaths=**} {
      // Allow users to upload their own profile picture
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*');
      
      // Allow users to read their own profile picture
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow admins to read any profile picture
      allow read: if request.auth != null 
                   && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish Rules

1. Click **Publish** to save the rules
2. Wait a few seconds for the rules to propagate

### Step 4: Test

Try uploading a profile picture again. It should work now!

## Troubleshooting

### Error: "Storage permission denied"
- Make sure you've published the security rules
- Check that you're logged in as the correct user
- Verify the user document exists in Firestore with the correct `uid`

### Error: "Upload was canceled"
- Check your internet connection
- Try uploading a smaller file (< 5MB)

### Upload hangs indefinitely
- Check browser console for errors
- Verify Firebase Storage is enabled in your project
- Make sure the storage bucket is properly configured

