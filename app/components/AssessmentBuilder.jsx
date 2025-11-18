'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * AssessmentBuilder Component
 * Allows teachers to build assessments with different question types
 * Supports: MCQ, True/False, Short Text, Coding Questions
 */
export default function AssessmentBuilder({ questions, onQuestionsChange }) {
	const [expandedQuestion, setExpandedQuestion] = useState(null);

	const addQuestion = (type) => {
		const newQuestion = {
			id: Date.now().toString(),
			type,
			question: '',
			points: 1,
		};

		// Set default fields based on type
		if (type === 'mcq') {
			newQuestion.options = ['', '', '', ''];
			newQuestion.correctAnswer = 0;
		} else if (type === 'true-false') {
			newQuestion.correctAnswer = 'true';
		} else if (type === 'short-text') {
			newQuestion.correctAnswer = '';
			newQuestion.caseSensitive = false;
		} else if (type === 'coding') {
			newQuestion.language = 'javascript';
			newQuestion.starterCode = '';
			newQuestion.solution = '';
			newQuestion.testCases = [];
		}

		const updatedQuestions = [...questions, newQuestion];
		onQuestionsChange(updatedQuestions);
		setExpandedQuestion(newQuestion.id);
	};

	const removeQuestion = (id) => {
		const updatedQuestions = questions.filter((q) => q.id !== id);
		onQuestionsChange(updatedQuestions);
		if (expandedQuestion === id) {
			setExpandedQuestion(null);
		}
	};

	const updateQuestion = (id, field, value) => {
		const updatedQuestions = questions.map((q) => {
			if (q.id === id) {
				return { ...q, [field]: value };
			}
			return q;
		});
		onQuestionsChange(updatedQuestions);
	};

	const updateMcqOption = (questionId, optionIndex, value) => {
		const updatedQuestions = questions.map((q) => {
			if (q.id === questionId) {
				const newOptions = [...q.options];
				newOptions[optionIndex] = value;
				return { ...q, options: newOptions };
			}
			return q;
		});
		onQuestionsChange(updatedQuestions);
	};

	const addMcqOption = (questionId) => {
		const updatedQuestions = questions.map((q) => {
			if (q.id === questionId) {
				return { ...q, options: [...q.options, ''] };
			}
			return q;
		});
		onQuestionsChange(updatedQuestions);
	};

	const removeMcqOption = (questionId, optionIndex) => {
		const updatedQuestions = questions.map((q) => {
			if (q.id === questionId && q.options.length > 2) {
				const newOptions = q.options.filter((_, i) => i !== optionIndex);
				return { ...q, options: newOptions };
			}
			return q;
		});
		onQuestionsChange(updatedQuestions);
	};

	const moveQuestion = (index, direction) => {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= questions.length) return;

		const updatedQuestions = [...questions];
		[updatedQuestions[index], updatedQuestions[newIndex]] = [updatedQuestions[newIndex], updatedQuestions[index]];
		onQuestionsChange(updatedQuestions);
	};

	const renderQuestionEditor = (question, index) => {
		const isExpanded = expandedQuestion === question.id;

		return (
			<Card key={question.id} className="mb-4">
				<CardContent className="pt-6">
					{/* Question Header */}
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<span className="text-body font-semibold text-neutralDark">
								Question {index + 1}
							</span>
							<span className="px-3 py-1 bg-primary/10 text-primary text-caption rounded-full">
								{question.type === 'mcq' && 'Multiple Choice'}
								{question.type === 'true-false' && 'True/False'}
								{question.type === 'short-text' && 'Short Text'}
								{question.type === 'coding' && 'Coding'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => moveQuestion(index, 'up')}
								disabled={index === 0}
							>
								<ChevronUp className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => moveQuestion(index, 'down')}
								disabled={index === questions.length - 1}
							>
								<ChevronDown className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
							>
								{isExpanded ? 'Collapse' : 'Expand'}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeQuestion(question.id)}
								className="text-error hover:text-error"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{isExpanded && (
						<div className="space-y-4 pt-4 border-t border-border">
							{/* Question Text */}
							<label className="block">
								<span className="block text-body font-medium text-neutralDark mb-2">
									Question Text *
								</span>
								<textarea
									value={question.question}
									onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
									rows={3}
									placeholder="Enter your question here..."
									className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
									required
								/>
							</label>

							{/* Points */}
							<label className="block">
								<span className="block text-body font-medium text-neutralDark mb-2">
									Points
								</span>
								<Input
									type="number"
									min="0"
									step="0.5"
									value={question.points}
									onChange={(e) => updateQuestion(question.id, 'points', parseFloat(e.target.value) || 0)}
									placeholder="Points"
								/>
							</label>

							{/* Type-specific fields */}
							{question.type === 'mcq' && (
								<div className="space-y-3">
									<span className="block text-body font-medium text-neutralDark">
										Options *
									</span>
									{question.options.map((option, optionIndex) => (
										<div key={optionIndex} className="flex items-center gap-2">
											<input
												type="radio"
												name={`correct-${question.id}`}
												checked={question.correctAnswer === optionIndex}
												onChange={() => updateQuestion(question.id, 'correctAnswer', optionIndex)}
												className="w-4 h-4"
											/>
											<Input
												value={option}
												onChange={(e) => updateMcqOption(question.id, optionIndex, e.target.value)}
												placeholder={`Option ${optionIndex + 1}`}
												required
											/>
											{question.options.length > 2 && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeMcqOption(question.id, optionIndex)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => addMcqOption(question.id)}
									>
										<Plus className="h-4 w-4 mr-2" />
										Add Option
									</Button>
								</div>
							)}

							{question.type === 'true-false' && (
								<label className="block">
									<span className="block text-body font-medium text-neutralDark mb-2">
										Correct Answer *
									</span>
									<select
										value={question.correctAnswer}
										onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
										className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
										required
									>
										<option value="true">True</option>
										<option value="false">False</option>
									</select>
								</label>
							)}

							{question.type === 'short-text' && (
								<>
									<label className="block">
										<span className="block text-body font-medium text-neutralDark mb-2">
											Expected Answer
										</span>
										<Input
											value={question.correctAnswer}
											onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
											placeholder="Enter expected answer (optional for manual grading)"
										/>
									</label>
									<label className="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={question.caseSensitive}
											onChange={(e) => updateQuestion(question.id, 'caseSensitive', e.target.checked)}
											className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
										/>
										<span className="text-body text-neutralDark">Case Sensitive</span>
									</label>
								</>
							)}

							{question.type === 'coding' && (
								<>
									<label className="block">
										<span className="block text-body font-medium text-neutralDark mb-2">
											Programming Language *
										</span>
										<select
											value={question.language}
											onChange={(e) => updateQuestion(question.id, 'language', e.target.value)}
											className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
											required
										>
											<option value="javascript">JavaScript</option>
											<option value="python">Python</option>
											<option value="java">Java</option>
											<option value="cpp">C++</option>
											<option value="csharp">C#</option>
										</select>
									</label>
									<label className="block">
										<span className="block text-body font-medium text-neutralDark mb-2">
											Starter Code
										</span>
										<textarea
											value={question.starterCode}
											onChange={(e) => updateQuestion(question.id, 'starterCode', e.target.value)}
											rows={5}
											placeholder="// Write starter code here..."
											className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
										/>
									</label>
								</>
							)}
						</div>
					)}

					{!isExpanded && (
						<div className="text-body text-muted-foreground truncate">
							{question.question || 'No question text yet...'}
						</div>
					)}
				</CardContent>
			</Card>
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-h3 text-neutralDark mb-4">Questions</h3>
				
				{/* Question Type Buttons */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => addQuestion('mcq')}
						className="flex items-center justify-center gap-2"
					>
						<Plus className="h-4 w-4" />
						MCQ
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => addQuestion('true-false')}
						className="flex items-center justify-center gap-2"
					>
						<Plus className="h-4 w-4" />
						True/False
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => addQuestion('short-text')}
						className="flex items-center justify-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Short Text
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => addQuestion('coding')}
						className="flex items-center justify-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Coding
					</Button>
				</div>
			</div>

			{/* Questions List */}
			{questions.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">
							No questions added yet. Click the buttons above to add different question types.
						</p>
					</CardContent>
				</Card>
			) : (
				<div>
					{questions.map((question, index) => renderQuestionEditor(question, index))}
				</div>
			)}
		</div>
	);
}





