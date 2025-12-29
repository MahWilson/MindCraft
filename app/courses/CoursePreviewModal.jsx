'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, User, X, Eye, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CoursePreviewModal({ course, isOpen, onClose, currentUserId, onEnroll }) {
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(false);
	const [totalLessons, setTotalLessons] = useState(0);
	const [moduleLessonsCount, setModuleLessonsCount] = useState({}); // moduleId -> lesson count

	useEffect(() => {
		if (isOpen && course) {
			loadCoursePreview();
		} else {
			// Reset when modal closes
			setModules([]);
			setTotalLessons(0);
			setModuleLessonsCount({});
		}
	}, [isOpen, course]);

	async function loadCoursePreview() {
		if (!course || !course.modules || course.modules.length === 0) {
			setModules([]);
			setTotalLessons(0);
			setModuleLessonsCount({});
			return;
		}

		setLoading(true);
		try {
			const loadedModules = [];
			const lessonsCountMap = {};
			let total = 0;

			// Load modules
			for (const moduleId of course.modules) {
				try {
					const moduleDoc = await getDoc(doc(db, 'module', moduleId));
					if (moduleDoc.exists()) {
						const moduleData = {
							id: moduleDoc.id,
							...moduleDoc.data(),
						};
						loadedModules.push(moduleData);
					}
				} catch (err) {
					console.error(`Error loading module ${moduleId}:`, err);
				}
			}

			// Sort modules by order
			loadedModules.sort((a, b) => (a.order || 0) - (b.order || 0));

			// Load lessons for each module (using the same logic as course detail page)
			for (const module of loadedModules) {
				try {
					// Try to query lessons by moduleId first (preferred method)
					const lessonsQuery = query(
						collection(db, 'lesson'),
						where('moduleId', '==', module.id),
						orderBy('order', 'asc')
					);
					const lessonsSnapshot = await getDocs(lessonsQuery);
					const lessonCount = lessonsSnapshot.docs.length;
					lessonsCountMap[module.id] = lessonCount;
					total += lessonCount;
				} catch (lessonErr) {
					// Fallback: try to load from module.lessons array
					if (module.lessons && Array.isArray(module.lessons)) {
						// Count unique lesson IDs
						const uniqueLessons = new Set(module.lessons);
						const lessonCount = uniqueLessons.size;
						lessonsCountMap[module.id] = lessonCount;
						total += lessonCount;
					} else {
						lessonsCountMap[module.id] = 0;
					}
				}
			}

			setModules(loadedModules);
			setModuleLessonsCount(lessonsCountMap);
			setTotalLessons(total);
		} catch (err) {
			console.error('Error loading course preview:', err);
		} finally {
			setLoading(false);
		}
	}

	if (!isOpen || !course) return null;

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
			onClick={onClose}
		>
			<Card 
				className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-4"
				onClick={(e) => e.stopPropagation()}
			>
				<CardHeader className="flex-shrink-0 border-b border-border">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-h2 mb-2">{course.title}</CardTitle>
							<CardDescription className="text-body">
								{course.description || 'No description provided'}
							</CardDescription>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="flex-shrink-0"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</CardHeader>

				<CardContent className="flex-1 overflow-y-auto pt-6 space-y-6">
					{/* Course Info */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2 text-body text-muted-foreground">
							<User className="h-5 w-5 flex-shrink-0" />
							<span>By: {course.authorName || 'Unknown'}</span>
						</div>
						<div className="flex items-center gap-2 text-body text-muted-foreground">
							<BookOpen className="h-5 w-5 flex-shrink-0" />
							<span>{course.modules?.length || 0} {course.modules?.length === 1 ? 'Module' : 'Modules'}</span>
						</div>
						<div className="flex items-center gap-2 text-body text-muted-foreground">
							<FileText className="h-5 w-5 flex-shrink-0" />
							<span>{totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className={`px-3 py-1 rounded-full text-caption font-medium ${
								course.status === 'published' 
									? 'bg-success/10 text-success' 
									: 'bg-warning/10 text-warning'
							}`}>
								{course.status === 'published' ? 'Published' : 'Draft'}
							</span>
						</div>
					</div>

					{/* Course Structure */}
					<div className="space-y-4">
						<h3 className="text-h3 text-neutralDark">Course Structure</h3>
						
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : modules.length > 0 ? (
							<div className="space-y-3">
								{modules.map((module, index) => {
									const lessonCount = moduleLessonsCount[module.id] || 0;
									return (
										<div
											key={module.id}
											className="p-4 rounded-lg border border-border bg-muted/30"
										>
											<div className="flex items-start gap-3">
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-body font-semibold flex-shrink-0">
													{index + 1}
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="text-body font-semibold text-neutralDark mb-1">
														{module.title}
													</h4>
													<p className="text-caption text-muted-foreground">
														{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="text-center py-8 text-body text-muted-foreground">
								<BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p>This course doesn't have any modules yet.</p>
							</div>
						)}
					</div>
				</CardContent>

				{/* Action Buttons */}
				<div className="flex-shrink-0 border-t border-border p-6 bg-muted/30">
					<div className="flex items-center gap-3">
						<Link href={`/courses/${course.id}`} className="flex-1">
							<Button variant="outline" className="w-full" onClick={onClose}>
								<Eye className="h-4 w-4 mr-2" />
								View Full Details
							</Button>
						</Link>
						{course.status === 'published' && currentUserId && (
							<Button
								onClick={() => {
									if (onEnroll) {
										onEnroll();
									}
									onClose();
								}}
								className="flex-1"
							>
								Enroll Now
							</Button>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
}

