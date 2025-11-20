# AI Learning Features - Code Snippets

This document contains code snippets for the AI-powered learning content features implemented for SDM meeting demonstration.

## Features Overview

1. **Format Learning Content** - Cleans up and formats existing lesson content
2. **Generate Learning Content** - AI-generated lesson content based on lesson title

---

## Component: AILearningHelper

**Location:** `app/components/AILearningHelper.jsx`

### Key Functions

#### 1. Format Learning Content

```javascript
/**
 * Format Learning Content
 * Placeholder: Simulates AI formatting with a delay
 */
async function handleFormatContent() {
	if (!currentContent.trim()) {
		alert('Please add some content to format first.');
		return;
	}

	setIsFormatting(true);
	setFormatSuccess(false);

	try {
		// Simulate AI processing delay
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Placeholder: Format content (remove extra whitespace, fix formatting)
		const formatted = formatContentPlaceholder(currentContent);
		
		if (onFormatContent) {
			onFormatContent(formatted);
		}

		setFormatSuccess(true);
		setTimeout(() => setFormatSuccess(false), 3000);
	} catch (error) {
		console.error('Error formatting content:', error);
		alert('Failed to format content. Please try again.');
	} finally {
		setIsFormatting(false);
	}
}
```

#### 2. Generate Learning Content

```javascript
/**
 * Generate Learning Content
 * Placeholder: Simulates AI content generation with a delay
 */
async function handleGenerateContent() {
	if (!lessonTitle.trim()) {
		alert('Please enter a lesson title first.');
		return;
	}

	setIsGenerating(true);
	setGenerateSuccess(false);

	try {
		// Simulate AI processing delay
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Placeholder: Generate content based on lesson title
		const generated = generateContentPlaceholder(lessonTitle);
		
		if (onGenerateContent) {
			onGenerateContent(generated);
		}

		setGenerateSuccess(true);
		setTimeout(() => setGenerateSuccess(false), 3000);
	} catch (error) {
		console.error('Error generating content:', error);
		alert('Failed to generate content. Please try again.');
	} finally {
		setIsGenerating(false);
	}
}
```

#### 3. Placeholder Implementation Functions

```javascript
/**
 * Placeholder: Format content (remove extra whitespace, fix line breaks)
 */
function formatContentPlaceholder(content) {
	// Remove excessive whitespace
	let formatted = content.replace(/\s+/g, ' ');
	
	// Fix paragraph breaks
	formatted = formatted.replace(/<\/p>\s*<p>/g, '</p>\n<p>');
	
	// Clean up HTML formatting
	formatted = formatted.trim();
	
	return formatted;
}

/**
 * Placeholder: Generate content based on lesson title
 */
function generateContentPlaceholder(title) {
	return `
		<h2>Introduction to ${title}</h2>
		<p>Welcome to this lesson on <strong>${title}</strong>. In this module, we will explore the fundamental concepts and practical applications.</p>
		
		<h3>Learning Objectives</h3>
		<ul>
			<li>Understand the core concepts of ${title}</li>
			<li>Apply ${title} principles in practical scenarios</li>
			<li>Analyze real-world examples</li>
		</ul>
		
		<h3>Key Concepts</h3>
		<p>Let's begin by examining the key concepts that form the foundation of ${title}.</p>
		
		<h3>Practical Examples</h3>
		<p>Here are some practical examples to help you understand how ${title} is applied in real-world situations.</p>
		
		<h3>Summary</h3>
		<p>In this lesson, we've covered the essential aspects of ${title}. Continue practicing to master these concepts.</p>
	`;
}
```

---

## Integration: Module Detail Page

**Location:** `app/dashboard/modules/[id]/page.jsx`

### Usage in Edit Mode

```javascript
{editingLessonId === lesson.id ? (
	// Edit Mode
	<div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
		<div className="space-y-4">
			<Input
				value={editLessonTitle}
				onChange={(e) => setEditLessonTitle(e.target.value)}
				placeholder="Lesson title"
			/>
			<RichTextEditor
				value={editLessonContent}
				onChange={setEditLessonContent}
				placeholder="Start typing your lesson content..."
			/>
			{/* AI Learning Helper */}
			<AILearningHelper
				currentContent={editLessonContent}
				lessonTitle={editLessonTitle}
				onFormatContent={(formatted) => setEditLessonContent(formatted)}
				onGenerateContent={(generated) => setEditLessonContent(generated)}
			/>
			{/* Save/Cancel buttons */}
		</div>
	</div>
) : (
	// View Mode
	...
)}
```

### Usage in Add New Lesson

```javascript
{/* Add Lesson */}
<div className="space-y-4 pt-4 border-t border-border">
	<Input
		value={newLessonTitle}
		onChange={(e) => setNewLessonTitle(e.target.value)}
		placeholder="Lesson title"
	/>
	<RichTextEditor
		value={newLessonContent}
		onChange={setNewLessonContent}
		placeholder="Start typing your lesson content..."
	/>
	{/* AI Learning Helper */}
	<AILearningHelper
		currentContent={newLessonContent}
		lessonTitle={newLessonTitle}
		onFormatContent={(formatted) => setNewLessonContent(formatted)}
		onGenerateContent={(generated) => setNewLessonContent(generated)}
	/>
	<Button onClick={addLesson}>Add Lesson</Button>
</div>
```

---

## UI Component Structure

### AILearningHelper Component Props

```typescript
interface AILearningHelperProps {
	onFormatContent: (formatted: string) => void;
	onGenerateContent: (generated: string) => void;
	currentContent?: string;
	lessonTitle?: string;
}
```

### Component Features

- **Format Button**: Formats existing content with loading states
- **Generate Button**: Generates new content based on lesson title
- **Loading Indicators**: Shows spinner during processing
- **Success Feedback**: Displays checkmark after successful operations
- **Disabled States**: Buttons disabled when prerequisites not met

---

## Future Implementation Notes

### Actual AI Integration Points

1. **Format Learning Content**:
   - Replace `formatContentPlaceholder()` with actual AI API call
   - Use OpenAI GPT or similar for content formatting
   - Endpoint: `/api/ai/format-content`

2. **Generate Learning Content**:
   - Replace `generateContentPlaceholder()` with actual AI API call
   - Use OpenAI GPT with lesson context and curriculum guidelines
   - Endpoint: `/api/ai/generate-content`

3. **API Route Structure**:
   ```javascript
   // app/api/ai/format-content/route.js
   export async function POST(request) {
     const { content } = await request.json();
     // Call OpenAI API for formatting
     // Return formatted content
   }

   // app/api/ai/generate-content/route.js
   export async function POST(request) {
     const { title, moduleContext, curriculumLevel } = await request.json();
     // Call OpenAI API for generation
     // Return generated content
   }
   ```

---

## Testing Notes

- **Format Content**: Requires existing content in editor
- **Generate Content**: Requires lesson title to be entered
- Both features include 2-3 second delays to simulate AI processing
- Success states clear after 3 seconds
- Error handling with user-friendly alerts

---

## Status

✅ **Placeholder Implementation Complete**
- UI components implemented
- Integration with lesson editor complete
- Loading states and feedback working
- Ready for SDM demonstration

⏳ **Pending**
- Actual AI API integration
- Backend API routes for AI services
- Error handling for API failures
- Rate limiting and usage tracking

