'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * AI Learning Helper Component
 * Provides placeholder functionality for:
 * - Format Learning Content: Formats and cleans up lesson content
 * - Generate Learning Content: Generates lesson content using AI
 * 
 * Note: This is a placeholder implementation for SDM meeting demonstration.
 * Actual AI integration will be implemented later.
 */
export default function AILearningHelper({ 
	onFormatContent, 
	onGenerateContent,
	currentContent = '',
	lessonTitle = ''
}) {
	const [isFormatting, setIsFormatting] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [formatSuccess, setFormatSuccess] = useState(false);
	const [generateSuccess, setGenerateSuccess] = useState(false);

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

	return (
		<Card className="border-primary/20 bg-primary/5">
			<CardHeader>
				<div className="flex items-center gap-2">
					<Sparkles className="h-6 w-6 text-primary" />
					<CardTitle className="text-h3">AI Learning Assistant</CardTitle>
				</div>
				<CardDescription>
					Use AI-powered tools to enhance your lesson content
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Format Content Button */}
				<div className="flex items-center gap-3">
					<Button
						onClick={handleFormatContent}
						disabled={isFormatting || isGenerating || !currentContent.trim()}
						variant="outline"
						className="flex-1"
						title="Format and clean up the lesson content (removes extra whitespace, fixes formatting)"
					>
						{isFormatting ? (
							<>
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
								Formatting...
							</>
						) : formatSuccess ? (
							<>
								<CheckCircle2 className="h-5 w-5 mr-2 text-success" />
								Formatted!
							</>
						) : (
							<>
								<Wand2 className="h-5 w-5 mr-2" />
								Format Learning Content
							</>
						)}
					</Button>
					<div className="text-caption text-muted-foreground max-w-xs">
						Cleans up formatting, removes extra whitespace, and improves structure
					</div>
				</div>

				{/* Generate Content Button */}
				<div className="flex items-center gap-3">
					<Button
						onClick={handleGenerateContent}
						disabled={isFormatting || isGenerating || !lessonTitle.trim()}
						variant="outline"
						className="flex-1"
						title="Generate structured lesson content using AI based on the lesson title"
					>
						{isGenerating ? (
							<>
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
								Generating...
							</>
						) : generateSuccess ? (
							<>
								<CheckCircle2 className="h-5 w-5 mr-2 text-success" />
								Generated!
							</>
						) : (
							<>
								<Sparkles className="h-5 w-5 mr-2" />
								Generate Learning Content
							</>
						)}
					</Button>
					<div className="text-caption text-muted-foreground max-w-xs">
						AI generates structured lesson content based on the lesson title
					</div>
				</div>

				{/* Info Note */}
				<div className="pt-2 border-t border-border">
					<p className="text-caption text-muted-foreground italic">
						Note: This is a placeholder implementation. Actual AI integration will be added in future updates.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

