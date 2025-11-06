'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

export default function LessonPreviewPage() {
	const params = useParams();
	const router = useRouter();
	const { id: moduleId, lessonId } = params;
	
	const [lesson, setLesson] = useState(null);
	const [module, setModule] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		async function loadLesson() {
			try {
				// Load lesson
				const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
				if (!lessonDoc.exists()) {
					setError('Lesson not found');
					setLoading(false);
					return;
				}

				const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
				setLesson(lessonData);

				// Load module
				const moduleDoc = await getDoc(doc(db, 'modules', moduleId));
				if (moduleDoc.exists()) {
					setModule({ id: moduleDoc.id, ...moduleDoc.data() });
				}
			} catch (err) {
				console.error('Error loading lesson:', err);
				setError('Failed to load lesson');
			} finally {
				setLoading(false);
			}
		}

		if (moduleId && lessonId) {
			loadLesson();
		}
	}, [moduleId, lessonId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading preview...</p>
			</div>
		);
	}

	if (error || !lesson) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Lesson not found'}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Link href={`/dashboard/modules/${moduleId}`}>
					<Button variant="ghost" size="sm" className="hover:bg-neutralLight transition-colors duration-200">
						<ArrowLeft className="h-5 w-5 mr-2" />
						Back to Module
					</Button>
				</Link>
				<div className="flex items-center gap-2 text-caption text-muted-foreground">
					<Eye className="h-4 w-4" />
					<span>Preview Mode</span>
				</div>
			</div>

			{/* Student View Preview */}
			<div className="bg-neutralLight p-4 rounded-lg border-2 border-dashed border-primary/30">
				<p className="text-caption text-muted-foreground mb-4 font-medium">How students will see this lesson:</p>
				
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-h2">{lesson.title}</CardTitle>
					</CardHeader>
					<CardContent className="prose max-w-none">
						{lesson.contentHtml ? (
							<div 
								dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
								className="text-body text-neutralDark lesson-content"
							/>
						) : (
							<p className="text-body text-muted-foreground">No content available for this lesson yet.</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Style for lesson content */}
			<style jsx global>{`
				.lesson-content h1 {
					font-size: 2rem;
					font-weight: 600;
					margin-top: 1.5rem;
					margin-bottom: 1rem;
					color: #1A1C23;
				}
				.lesson-content h2 {
					font-size: 1.5rem;
					font-weight: 600;
					margin-top: 1.25rem;
					margin-bottom: 0.75rem;
					color: #1A1C23;
				}
				.lesson-content h3 {
					font-size: 1.25rem;
					font-weight: 500;
					margin-top: 1rem;
					margin-bottom: 0.5rem;
					color: #1A1C23;
				}
				.lesson-content p {
					margin-bottom: 1rem;
					line-height: 1.6;
				}
				.lesson-content ul, .lesson-content ol {
					margin-left: 1.5rem;
					margin-bottom: 1rem;
				}
				.lesson-content li {
					margin-bottom: 0.5rem;
				}
				.lesson-content a {
					color: #4C60FF;
					text-decoration: underline;
				}
				.lesson-content a:hover {
					color: #3d4dcc;
				}
				.lesson-content code {
					background-color: #f3f4f6;
					padding: 0.125rem 0.375rem;
					border-radius: 0.25rem;
					font-family: 'Courier New', monospace;
					font-size: 0.875rem;
				}
				.lesson-content pre {
					background-color: #1f2937;
					color: #f9fafb;
					padding: 1rem;
					border-radius: 0.5rem;
					overflow-x: auto;
					margin-bottom: 1rem;
				}
				.lesson-content pre code {
					background-color: transparent;
					color: inherit;
					padding: 0;
				}
			`}</style>
		</div>
	);
}

