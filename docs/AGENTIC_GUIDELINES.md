# Agentic AI Development Guidelines

This document provides guidelines for AI agents (like Cursor AI, GitHub Copilot, etc.) working on the MindCraft codebase.

## Firestore Collection Naming

### ⚠️ CRITICAL: Use SINGULAR Collection Names Only

All Firestore collections in this project use **singular** naming convention. This is a hard requirement.

**Correct (Singular):**
```javascript
// ✅ CORRECT
collection(db, 'user')
collection(db, 'course')
collection(db, 'module')
collection(db, 'lesson')
collection(db, 'assessment')
collection(db, 'assignment')
collection(db, 'submission')
collection(db, 'enrollment')
collection(db, 'progress')
collection(db, 'forum')
collection(db, 'setting')
```

**Incorrect (Plural - DO NOT USE):**
```javascript
// ❌ WRONG - DO NOT CREATE THESE
collection(db, 'users')      // Use 'user'
collection(db, 'courses')   // Use 'course'
collection(db, 'modules')    // Use 'module'
collection(db, 'lessons')    // Use 'lesson'
collection(db, 'assessments') // Use 'assessment'
collection(db, 'assignments') // Use 'assignment'
collection(db, 'submissions') // Use 'submission'
collection(db, 'enrollments') // Use 'enrollment'
collection(db, 'forums')      // Use 'forum'
collection(db, 'settings')    // Use 'setting'
```

### Why Singular?

- Migration from plural to singular has been completed
- Security rules are configured for singular names
- All existing code uses singular names
- Creating plural collections will break the application

### When Creating New Collections

If you need to create a new Firestore collection:
1. **Always use singular name**: `collection(db, 'newentity')` not `collection(db, 'newentities')`
2. **Update security rules**: Add rules in `docs/FIRESTORE_SECURITY_RULES.md`
3. **Update documentation**: Add to `docs/DATA_DESCRIPTION.md`
4. **Be consistent**: Use the same singular name everywhere

## Code Patterns

### Firestore Operations

```javascript
// ✅ CORRECT Pattern
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

// Get single document
const userDoc = await getDoc(doc(db, 'user', userId));

// Get collection
const coursesSnapshot = await getDocs(collection(db, 'course'));

// Create document
await addDoc(collection(db, 'assessment'), assessmentData);

// Update document
await updateDoc(doc(db, 'assignment', assignmentId), updateData);
```

### Security Rules Reference

Always check `docs/FIRESTORE_SECURITY_RULES.md` for:
- Current collection names
- Access rules for each collection
- Role-based permissions

## File Structure

### API Routes
- Location: `app/api/[collection]/route.js` or `app/api/[collection]/[id]/route.js`
- Use singular collection names in routes
- Example: `app/api/courses/[id]/route.js` uses `collection(db, 'course')` internally

### Pages
- Follow Next.js App Router structure
- Use singular names when referencing collections in code

## Common Mistakes to Avoid

1. **❌ Creating plural collections** - Always use singular
2. **❌ Mixing singular/plural** - Be consistent
3. **❌ Not checking security rules** - Rules use singular names
4. **❌ Assuming old plural names work** - They don't, migration is complete

## Verification Checklist

Before committing code that uses Firestore:
- [ ] All `collection()` calls use singular names
- [ ] All `doc()` calls use singular names
- [ ] Security rules reference singular names
- [ ] No references to old plural collection names
- [ ] Documentation updated if new collection created

## Reference Documents

- `docs/FIRESTORE_SECURITY_RULES.md` - Current security rules and collection names
- `docs/DATA_DESCRIPTION.md` - Data structure documentation
- `docs/VISION.md` - Project vision and collection list
- `prompts/MINDCRAFT_PROMPT.md` - Project context for AI agents

---

**Remember**: Singular collection names are not optional - they are required for the application to function correctly.

