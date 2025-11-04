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

		return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
	} catch (err) {
		return NextResponse.json({ error: 'AI stub failed', details: String(err) }, { status: 500 });
	}
}

// TODO(LLM): Example Gemini prompt template (for future wiring):
// "You are an instructional design assistant. Input: {lesson_text}. Task: ..."


