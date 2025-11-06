'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function LessonPage() {
	const params = useParams();
	const router = useRouter();
	const { id: courseId, moduleId, lessonId } = params;
	
	const [lesson, setLesson] = useState(null);
	const [module, setModule] = useState(null);
	const [course, setCourse] = useState(null);
	const [allLessons, setAllLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);

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
					const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };
					setModule(moduleData);

					// Load all lessons in module to get navigation
					if (moduleData.lessons && moduleData.lessons.length > 0) {
						const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
						const lessonsData = await lessonsResponse.json();
						if (lessonsData.lessons) {
							setAllLessons(lessonsData.lessons);
							const index = lessonsData.lessons.findIndex(l => l.id === lessonId);
							setCurrentLessonIndex(index);
						}
					}
				}

				// Load course for breadcrumb
				const courseDoc = await getDoc(doc(db, 'courses', courseId));
				if (courseDoc.exists()) {
					setCourse({ id: courseDoc.id, ...courseDoc.data() });
				}
			} catch (err) {
				console.error('Error loading lesson:', err);
				setError('Failed to load lesson');
			} finally {
				setLoading(false);
			}
		}

		if (courseId && moduleId && lessonId) {
			loadLesson();
		}
	}, [courseId, moduleId, lessonId]);

	const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1 
		? allLessons[currentLessonIndex + 1] 
		: null;
	const prevLesson = currentLessonIndex > 0 
		? allLessons[currentLessonIndex - 1] 
		: null;

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading lesson...</p>
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
			{/* Breadcrumb Navigation */}
			<div className="flex items-center gap-2 text-caption text-muted-foreground">
				<Link href="/courses" className="hover:text-neutralDark transition-colors">
					Courses
				</Link>
				<span>/</span>
				{course && (
					<>
						<Link href={`/courses/${courseId}`} className="hover:text-neutralDark transition-colors">
							{course.title}
						</Link>
						<span>/</span>
					</>
				)}
				{module && (
					<>
						<span>{module.title}</span>
						<span>/</span>
					</>
				)}
				<span className="text-neutralDark">{lesson.title}</span>
			</div>

			{/* Lesson Content */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-h2">{lesson.title}</CardTitle>
						<Link href={`/courses/${courseId}`}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Course
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent className="prose max-w-none">
					{lesson.contentHtml ? (
						<div 
							dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
							className="text-body text-neutralDark"
						/>
					) : (
						<p className="text-body text-muted-foreground">No content available for this lesson yet.</p>
					)}
				</CardContent>
			</Card>

			{/* Lesson Navigation */}
			<div className="flex items-center justify-between pt-4 border-t border-border">
				{prevLesson ? (
					<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${prevLesson.id}`}>
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Previous Lesson
						</Button>
					</Link>
				) : (
					<div></div>
				)}

				{nextLesson ? (
					<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${nextLesson.id}`}>
						<Button>
							Next Lesson
							<ArrowRight className="h-4 w-4 ml-2" />
						</Button>
					</Link>
				) : (
					<Link href={`/courses/${courseId}`}>
						<Button variant="outline">
							Complete Module
							<BookOpen className="h-4 w-4 ml-2" />
						</Button>
					</Link>
				)}
			</div>
		</div>
	);
}

