'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/app/components/RichTextEditor';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Pencil, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ModuleDetailPage() {
	const params = useParams();
	const router = useRouter();
	const moduleId = params.id;
	
	const [module, setModule] = useState(null);
	const [lessons, setLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editingTitle, setEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newLessonTitle, setNewLessonTitle] = useState('');
	const [newLessonContent, setNewLessonContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [editingLessonId, setEditingLessonId] = useState(null);
	const [editLessonTitle, setEditLessonTitle] = useState('');
	const [editLessonContent, setEditLessonContent] = useState('');

	useEffect(() => {
		loadModule();
	}, [moduleId]);

	async function loadModule() {
		setLoading(true);
		try {
			// Load module
			const moduleDoc = await getDoc(doc(db, 'modules', moduleId));
			if (!moduleDoc.exists()) {
				setError('Module not found');
				setLoading(false);
				return;
			}

			const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };
			setModule(moduleData);
			setNewTitle(moduleData.title);

			// Load lessons
			if (moduleData.lessons && moduleData.lessons.length > 0) {
				try {
					const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
					const lessonsData = await lessonsResponse.json();
					
					if (lessonsData.error) {
						console.error('Error fetching lessons:', lessonsData.error);
						// Fallback: load lessons directly from Firestore
						const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
						try {
							const lessonsQuery = query(
								collection(db, 'lessons'),
								where('moduleId', '==', moduleId)
							);
							const snapshot = await getDocs(lessonsQuery);
							const loadedLessons = snapshot.docs.map(doc => ({
								id: doc.id,
								...doc.data(),
							})).sort((a, b) => (a.order || 0) - (b.order || 0));
							setLessons(loadedLessons);
						} catch (fallbackErr) {
							console.error('Fallback lesson loading error:', fallbackErr);
							setLessons([]);
						}
					} else if (lessonsData.lessons) {
						setLessons(lessonsData.lessons);
					} else {
						setLessons([]);
					}
				} catch (err) {
					console.error('Error loading lessons:', err);
					setLessons([]);
				}
			} else {
				setLessons([]);
			}
		} catch (err) {
			console.error('Error loading module:', err);
			setError('Failed to load module');
		} finally {
			setLoading(false);
		}
	}

	async function updateModuleTitle() {
		if (!newTitle.trim()) {
			setEditingTitle(false);
			return;
		}

		setSubmitting(true);
		try {
			await updateDoc(doc(db, 'modules', moduleId), {
				title: newTitle.trim(),
				updatedAt: serverTimestamp(),
			});

			setModule(prev => ({ ...prev, title: newTitle.trim() }));
			setEditingTitle(false);
		} catch (err) {
			console.error('Error updating module title:', err);
			alert('Failed to update module title');
		} finally {
			setSubmitting(false);
		}
	}

	async function addLesson() {
		if (!newLessonTitle.trim()) return;

		setSubmitting(true);
		try {
			const response = await fetch('/api/lessons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					moduleId,
					title: newLessonTitle.trim(),
					contentHtml: newLessonContent || '',
					order: lessons.length,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Failed to create lesson');
			}

			// Clear form immediately for better UX
			setNewLessonTitle('');
			setNewLessonContent('');
			setSuccessMessage('Lesson added successfully!');

			// Clear success message after 3 seconds
			setTimeout(() => setSuccessMessage(''), 3000);

			// Reload lessons with a small delay to ensure Firestore has updated
			setTimeout(async () => {
				try {
					const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
					const lessonsData = await lessonsResponse.json();
					
					if (lessonsData.error) {
						console.error('Error fetching lessons:', lessonsData.error);
						// Try loading from module directly as fallback
						await loadModule();
					} else if (lessonsData.lessons) {
						setLessons(lessonsData.lessons);
						// Also update module to refresh lesson count
						await loadModule();
					} else {
						// Fallback: reload entire module
						await loadModule();
					}
				} catch (fetchErr) {
					console.error('Error reloading lessons:', fetchErr);
					// Fallback: reload entire module
					await loadModule();
				}
			}, 500);
		} catch (err) {
			console.error('Error adding lesson:', err);
			alert(err.message || 'Failed to add lesson');
		} finally {
			setSubmitting(false);
		}
	}

	function startEditLesson(lesson) {
		setEditingLessonId(lesson.id);
		setEditLessonTitle(lesson.title);
		setEditLessonContent(lesson.contentHtml || '');
	}

	function cancelEditLesson() {
		setEditingLessonId(null);
		setEditLessonTitle('');
		setEditLessonContent('');
	}

	async function saveLessonEdit(lessonId) {
		if (!editLessonTitle.trim()) {
			alert('Lesson title is required');
			return;
		}

		setSubmitting(true);
		try {
			const lessonRef = doc(db, 'lessons', lessonId);
			await updateDoc(lessonRef, {
				title: editLessonTitle.trim(),
				contentHtml: editLessonContent || '',
				updatedAt: serverTimestamp(),
			});

			// Reload lessons
			const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
			const lessonsData = await lessonsResponse.json();
			if (lessonsData.lessons) {
				setLessons(lessonsData.lessons);
			}

			setEditingLessonId(null);
			setEditLessonTitle('');
			setEditLessonContent('');
			setSuccessMessage('Lesson updated successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (err) {
			console.error('Error updating lesson:', err);
			alert(err.message || 'Failed to update lesson');
		} finally {
			setSubmitting(false);
		}
	}

	async function deleteLesson(lessonId) {
		if (!confirm('Delete this lesson?')) return;

		setSubmitting(true);
		try {
			const response = await fetch(`/api/lessons/${lessonId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}

			// Reload lessons
			const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
			const lessonsData = await lessonsResponse.json();
			if (lessonsData.lessons) {
				setLessons(lessonsData.lessons);
			}
			// Also reload module to update lesson count
			await loadModule();
		} catch (err) {
			console.error('Error deleting lesson:', err);
			alert(err.message || 'Failed to delete lesson');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading module...</p>
			</div>
		);
	}

	if (error || !module) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Module not found'}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link href="/dashboard/modules">
					<Button variant="ghost" size="sm" className="hover:bg-neutralLight transition-colors duration-200">
						<ArrowLeft className="h-5 w-5 mr-2" />
						Back to Module Library
					</Button>
				</Link>
			</div>

			{/* Module Title */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						{editingTitle ? (
							<div className="flex items-center gap-2 flex-1">
								<Input
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									className="flex-1"
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											updateModuleTitle();
										}
										if (e.key === 'Escape') {
											setEditingTitle(false);
											setNewTitle(module.title);
										}
									}}
								/>
								<Button
									size="sm"
									onClick={updateModuleTitle}
									disabled={submitting}
								>
									<Save className="h-5 w-5" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setEditingTitle(false);
										setNewTitle(module.title);
									}}
								>
									<X className="h-5 w-5" />
								</Button>
							</div>
						) : (
							<>
								<CardTitle className="text-h2">{module.title}</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setEditingTitle(true)}
								>
									<Edit2 className="h-5 w-5 mr-2" />
									Edit Title
								</Button>
							</>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2 text-caption text-muted-foreground">
						<span>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</span>
					</div>
				</CardContent>
			</Card>

			{/* Lessons List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">Lessons</CardTitle>
					<CardDescription>Manage lessons within this module</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{lessons.length > 0 ? (
						<div className="space-y-2">
							{lessons.map((lesson, index) => (
								<div key={lesson.id}>
									{editingLessonId === lesson.id ? (
										// Edit Mode
										<div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
											<div className="space-y-2">
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
												<div className="flex items-center gap-2">
													<Button
														size="sm"
														onClick={() => saveLessonEdit(lesson.id)}
														disabled={submitting || !editLessonTitle.trim()}
													>
														<Save className="h-5 w-5 mr-2" />
														Save
													</Button>
													<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
														<Button
															size="sm"
															variant="outline"
															disabled={submitting}
														>
															<Eye className="h-5 w-5 mr-2" />
															Preview
														</Button>
													</Link>
													<Button
														size="sm"
														variant="ghost"
														onClick={cancelEditLesson}
														disabled={submitting}
													>
														<X className="h-5 w-5 mr-2" />
														Cancel
													</Button>
												</div>
											</div>
										</div>
									) : (
										// View Mode
										<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-neutralLight hover:border-primary/30 transition-colors duration-200">
											<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium text-neutralDark">{lesson.title}</p>
												{lesson.contentHtml && (
													<p className="text-caption text-muted-foreground line-clamp-1">
														{lesson.contentHtml.replace(/<[^>]*>/g, '').substring(0, 50)}...
													</p>
												)}
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
													<Button
														variant="ghost"
														size="sm"
														disabled={submitting}
														className="hover:bg-primary/10"
														title="Preview lesson"
													>
														<Eye className="h-5 w-5" />
													</Button>
												</Link>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => startEditLesson(lesson)}
													disabled={submitting}
													className="hover:bg-primary/10"
													title="Edit lesson"
												>
													<Edit2 className="h-5 w-5" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteLesson(lesson.id)}
													className="text-error hover:text-error hover:bg-error/10"
													disabled={submitting}
													title="Delete lesson"
												>
													<Trash2 className="h-5 w-5" />
												</Button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-body text-muted-foreground py-4 text-center">
							No lessons in this module yet
						</p>
					)}

					{/* Success Message */}
					{successMessage && (
						<div className="p-3 rounded-lg bg-success/10 border border-success/20">
							<p className="text-caption text-success">{successMessage}</p>
						</div>
					)}

					{/* Add Lesson */}
					<div className="space-y-2 pt-4 border-t border-border">
						<Input
							value={newLessonTitle}
							onChange={(e) => setNewLessonTitle(e.target.value)}
							placeholder="Lesson title"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && e.ctrlKey) {
									e.preventDefault();
									addLesson();
								}
							}}
						/>
						<RichTextEditor
							value={newLessonContent}
							onChange={setNewLessonContent}
							placeholder="Start typing your lesson content..."
						/>
						<Button
							onClick={addLesson}
							disabled={submitting || !newLessonTitle.trim()}
							variant="outline"
						>
							<Plus className="h-5 w-5 mr-2" />
							{submitting ? 'Adding...' : 'Add Lesson'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

