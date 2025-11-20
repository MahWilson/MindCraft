// AI stub endpoint (deterministic) for Sprint 1–2
// POST /api/ai/generate-content (consolidated here as /api/ai)
// Request JSON:
// {
//   action: "improve_lesson" | "generate_exercises" | "generate_mcq",
//   input: string,
//   language: "en" | "bm",
//   options?: { difficulty?: string, numQuestions?: number, includeSampleCode?: boolean },
//   teacherId?: string
// }
//
// Response: deterministic sample JSON depending on action.
// TODO(LLM): Replace with Gemini API call; add rate-limiting and auth.

import { NextResponse } from 'next/server';

function sampleImproveLesson(includeSampleCode = true, language = 'en') {
	return {
		language,
		summary: 'Introduction to variables and data types in programming.',
		objectives: [
			'Explain what a variable is and why it is useful',
			'Identify common data types (number, string, boolean)',
			'Write simple code that uses variables',
		],
		examples: [
			includeSampleCode
				? {
					code: "let name = 'Aisha';\nlet age = 16;\nlet isStudent = true;",
					explain:
						"We create three variables: a string (name), a number (age), and a boolean (isStudent).",
				}
				: { code: '', explain: 'Example omitted (no code requested).' },
		],
		exercises: [
			{
				type: 'short',
				prompt: 'Create a variable called totalScore and set it to 0. What type is it?',
				answer: 'number',
				rubric: 'Answer identifies the data type correctly and initializes a variable.',
			},
		],
	};
}

function sampleGenerateExercises(numQuestions = 5, difficulty = 'beginner') {
	const count = Math.max(1, Math.min(20, Number(numQuestions) || 5));
	const items = Array.from({ length: count }).map((_, i) => ({
		id: i + 1,
		type: i % 2 === 0 ? 'mcq' : 'short',
		prompt:
			i % 2 === 0
				? `Which data type best fits the value "Hello"? (${difficulty})`
				: `Explain what a boolean is in one sentence. (${difficulty})`,
		choices: i % 2 === 0 ? ['number', 'string', 'boolean', 'array'] : undefined,
		answer: i % 2 === 0 ? 1 : 'A boolean is either true or false.',
		rubric:
			i % 2 === 0
				? 'Correct index should be 1 (string).'
				: 'Statement should mention true/false explicitly.',
	}));
	return { difficulty, questions: items };
}

function sampleGenerateMcq(numQuestions = 5) {
	const count = Math.max(1, Math.min(20, Number(numQuestions) || 5));
	const questions = Array.from({ length: count }).map((_, i) => ({
		q: `What is the result of 2 + ${i}?`,
		choices: [String(1 + i), String(2 + i), String(3 + i), String(4 + i)],
		answer: 1,
		note: 'Simple arithmetic check; ensure students can add integers.',
	}));
	return { questions };
}

function sampleGenerateAssignment(courseTitle = '', courseDescription = '') {
	// Generate assignment scaffold based on course topic
	const topic = courseTitle || 'Programming';
	
	// Sample assignment titles based on common programming topics
	const titleTemplates = {
		'python': 'Python Programming Project: Data Structures Implementation',
		'javascript': 'JavaScript Web Application: Interactive Features',
		'java': 'Java Object-Oriented Programming: Class Design',
		'html': 'HTML/CSS Portfolio Website Project',
		'css': 'Responsive Web Design Challenge',
		'web': 'Full-Stack Web Application Development',
		'programming': 'Programming Fundamentals: Problem Solving Project',
		'data': 'Data Structures and Algorithms Assignment',
		'database': 'Database Design and Implementation Project',
	};
	
	// Find matching template or use generic
	let assignmentTitle = titleTemplates['programming']; // default
	for (const [key, value] of Object.entries(titleTemplates)) {
		if (topic.toLowerCase().includes(key)) {
			assignmentTitle = value;
			break;
		}
	}
	
	// Generate description scaffold
	const description = `<h2>Assignment Overview</h2>
<p>This assignment will help you apply the concepts learned in <strong>${courseTitle || 'this course'}</strong>.</p>

<h3>Learning Objectives</h3>
<ul>
	<li>Demonstrate understanding of core concepts</li>
	<li>Apply practical problem-solving skills</li>
	<li>Create a functional solution</li>
	<li>Document your code and process</li>
</ul>

<h3>Requirements</h3>
<ol>
	<li>Read and understand the problem statement</li>
	<li>Design your solution approach</li>
	<li>Implement the solution</li>
	<li>Test your implementation</li>
	<li>Submit your work with proper documentation</li>
</ol>

<h3>Submission Guidelines</h3>
<ul>
	<li>Submit all source code files</li>
	<li>Include a README file explaining your approach</li>
	<li>Add comments to your code for clarity</li>
	<li>Ensure your code follows best practices</li>
</ul>

<h3>Evaluation Criteria</h3>
<ul>
	<li>Correctness of implementation (40%)</li>
	<li>Code quality and organization (30%)</li>
	<li>Documentation and comments (20%)</li>
	<li>Problem-solving approach (10%)</li>
</ul>

<p><em>Note: This is a scaffold template. Please customize the requirements, objectives, and evaluation criteria based on your specific assignment needs.</em></p>`;
	
	return {
		title: assignmentTitle,
		description: description,
	};
}

function sampleGenerateAssessment(courseTitle = '', courseDescription = '', type = 'quiz', numQuestions = 5) {
	const topic = courseTitle || 'Programming';
	
	const titleTemplates = {
		'python': 'Python Fundamentals Assessment',
		'javascript': 'JavaScript Concepts Quiz',
		'java': 'Java Programming Assessment',
		'html': 'HTML/CSS Knowledge Test',
		'css': 'CSS Styling Quiz',
		'web': 'Web Development Assessment',
		'programming': 'Programming Fundamentals Quiz',
		'data': 'Data Structures Assessment',
		'database': 'Database Concepts Quiz',
	};
	
	let assessmentTitle = titleTemplates['programming'];
	for (const [key, value] of Object.entries(titleTemplates)) {
		if (topic.toLowerCase().includes(key)) {
			assessmentTitle = value;
			break;
		}
	}
	
	const description = `<h2>Assessment Overview</h2>
<p>This assessment will test your understanding of concepts covered in <strong>${courseTitle || 'this course'}</strong>.</p>

<h3>Instructions</h3>
<ul>
	<li>Read each question carefully</li>
	<li>Select the best answer for multiple choice questions</li>
	<li>Provide detailed answers for text-based questions</li>
	<li>Review your answers before submitting</li>
</ul>

<p><em>Good luck!</em></p>`;

	// Generate sample questions
	const questions = Array.from({ length: numQuestions }).map((_, i) => {
		if (type === 'quiz' || type === 'mcq') {
			return {
				type: 'mcq',
				question: `Question ${i + 1}: Which of the following best describes ${topic.toLowerCase()}?`,
				options: [
					`Option A: First choice`,
					`Option B: Second choice`,
					`Option C: Third choice`,
					`Option D: Fourth choice`,
				],
				correctAnswer: i % 4,
				points: 1,
			};
		} else {
			return {
				type: 'text',
				question: `Question ${i + 1}: Explain the concept of ${topic.toLowerCase()} in your own words.`,
				correctAnswer: `Sample answer for ${topic.toLowerCase()} concept.`,
				points: 2,
			};
		}
	});
	
	return {
		title: assessmentTitle,
		description: description,
		questions: questions,
	};
}

export async function POST(request) {
	try {
		const body = await request.json();
		const { action, input = '', language = 'en', options = {} } = body || {};

		if (!action) {
			return NextResponse.json({ error: 'Missing action' }, { status: 400 });
		}

		// Deterministic stub outputs
		if (action === 'improve_lesson') {
			const resp = sampleImproveLesson(Boolean(options.includeSampleCode ?? true), language);
			return NextResponse.json(resp);
		}
		if (action === 'generate_exercises') {
			const resp = sampleGenerateExercises(options.numQuestions ?? 5, options.difficulty || 'beginner');
			return NextResponse.json(resp);
		}
		if (action === 'generate_mcq') {
			const resp = sampleGenerateMcq(options.numQuestions ?? 5);
			return NextResponse.json(resp);
		}
		if (action === 'generate_assignment') {
			const resp = sampleGenerateAssignment(options.courseTitle || '', options.courseDescription || '');
			return NextResponse.json(resp);
		}
		if (action === 'generate_assessment') {
			const resp = sampleGenerateAssessment(
				options.courseTitle || '', 
				options.courseDescription || '',
				options.type || 'quiz',
				options.numQuestions || 5
			);
			return NextResponse.json(resp);
		}

		return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
	} catch (err) {
		return NextResponse.json({ error: 'AI stub failed', details: String(err) }, { status: 500 });
	}
}

// TODO(LLM): Example Gemini prompt template (for future wiring):
// "You are an instructional design assistant. Input: {lesson_text}. Task: ..."


