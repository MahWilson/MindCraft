'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';

export default function CourseModuleManager({ courseId, initialModules = [], onModulesChange }) {
	const [modules, setModules] = useState([]);
	const [expandedModules, setExpandedModules] = useState({});
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Load existing modules if courseId is provided
		if (courseId) {
			loadModules();
		} else {
			// For new courses, use initial modules
			setModules(initialModules || []);
		}
	}, [courseId]);

	async function loadModules() {
		if (!courseId) return;
		
		setLoading(true);
		try {
			// Load course to get module IDs
			const courseDoc = await getDoc(doc(db, 'course', courseId));
			if (!courseDoc.exists()) {
				setLoading(false);
				return;
			}

			const courseData = courseDoc.data();
			const moduleIds = courseData.modules || [];
			
			if (moduleIds.length === 0) {
				setModules([]);
				setLoading(false);
				return;
			}

			// Load modules directly from Firestore (client-side with auth)
			const loadedModules = [];
			for (const moduleId of moduleIds) {
				try {
					const moduleDoc = await getDoc(doc(db, 'module', moduleId));
					if (moduleDoc.exists()) {
						const moduleData = {
							id: moduleDoc.id,
							...moduleDoc.data(),
						};
						
						// Load lesson count
						let lessonCount = 0;
						if (moduleData.lessons && moduleData.lessons.length > 0) {
							// Try to get lessons count from Firestore query
							try {
								const { collection, query, where, getDocs } = await import('firebase/firestore');
								const lessonsQuery = query(
									collection(db, 'lesson'),
									where('moduleId', '==', moduleId)
								);
								const lessonsSnapshot = await getDocs(lessonsQuery);
								lessonCount = lessonsSnapshot.size;
							} catch (lessonErr) {
								// Fallback: use length of lessons array
								lessonCount = moduleData.lessons.length;
							}
						}
						
						loadedModules.push({
							...moduleData,
							lessonCount,
						});
					}
				} catch (moduleErr) {
					console.error(`Error loading module ${moduleId}:`, moduleErr);
				}
			}
			
			// Sort by order
			loadedModules.sort((a, b) => (a.order || 0) - (b.order || 0));
			setModules(loadedModules);
			
			// Auto-expand first module if there are modules
			if (loadedModules.length > 0 && Object.keys(expandedModules).length === 0) {
				setExpandedModules({ [loadedModules[0].id]: true });
			}
		} catch (err) {
			console.error('Error loading modules:', err);
		} finally {
			setLoading(false);
		}
	}


	async function addModule() {
		if (!newModuleTitle.trim()) return;

		setLoading(true);
		try {
			if (courseId) {
				// Create module directly in Firestore (client-side with Firebase Auth)
				// Check authentication
				if (!auth.currentUser) {
					throw new Error('You must be signed in to create a module');
				}

				// Create module in Firestore with courseId (modules are course-specific)
				const moduleData = {
					title: newModuleTitle.trim(),
					order: modules.length,
					lessons: [],
					courseId: courseId, // Module belongs to this course
					createdBy: auth.currentUser.uid, // Track module owner
					collaborators: [], // Reserved for future collaboration features
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				};

				const moduleRef = await addDoc(collection(db, 'module'), moduleData);

				// Link module to course
				const courseRef = doc(db, 'course', courseId);
				const courseDoc = await getDoc(courseRef);

				if (courseDoc.exists()) {
					const courseModules = courseDoc.data().modules || [];
					if (!courseModules.includes(moduleRef.id)) {
						await updateDoc(courseRef, {
							modules: [...courseModules, moduleRef.id],
							updatedAt: serverTimestamp(),
						});
					}
				}

				// Reload modules to show the new one
				await loadModules();
			} else {
				// For new courses (not saved yet), add to local state
				const newModule = {
					id: `temp-${Date.now()}`,
					title: newModuleTitle.trim(),
					order: modules.length,
					lessons: [],
					lessonCount: 0,
					temp: true,
				};
				const updated = [...modules, newModule];
				setModules(updated);
				onModulesChange?.(updated);
			}

			setNewModuleTitle('');
		} catch (err) {
			console.error('Error adding module:', err);
			alert(err.message || 'Failed to add module');
		} finally {
			setLoading(false);
		}
	}


	async function removeModule(moduleId) {
		if (!confirm('Delete this module and all its lessons? This action cannot be undone.')) return;

		setLoading(true);
		try {
			if (courseId && !moduleId.startsWith('temp-')) {
				// Delete the module (and it will be removed from course automatically)
				const response = await fetch(`/api/modules/${moduleId}`, {
					method: 'DELETE',
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || 'Failed to delete module');
				}

				// Reload modules
				await loadModules();
			} else {
				// Remove from local state for new courses
				const updated = modules.filter(m => m.id !== moduleId);
				setModules(updated);
				onModulesChange?.(updated);
			}
		} catch (err) {
			console.error('Error removing module:', err);
			alert(err.message || 'Failed to remove module');
		} finally {
			setLoading(false);
		}
	}

	function toggleModule(moduleId) {
		setExpandedModules(prev => ({
			...prev,
			[moduleId]: !prev[moduleId],
		}));
	}

	if (loading && modules.length === 0) {
		return <p className="text-body text-muted-foreground">Loading modules...</p>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-h3 text-neutralDark">Course Modules</h3>
				<p className="text-caption text-muted-foreground">Organize your course into chapters/modules</p>
			</div>

			{/* Add Module */}
			<div className="flex gap-2">
				<Input
					value={newModuleTitle}
					onChange={(e) => setNewModuleTitle(e.target.value)}
					placeholder="Module title (e.g., 'Chapter 1: Introduction')"
					className="flex-1"
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addModule();
						}
					}}
					disabled={!courseId}
				/>
				<Button 
					onClick={addModule} 
					disabled={loading || !newModuleTitle.trim() || !courseId}
					title={courseId ? "Create a new module for this course" : "Save the course first to add modules"}
				>
					<Plus className="h-5 w-5 mr-2" />
					Add Module
				</Button>
			</div>

			{/* Modules List */}
			<div className="space-y-3">
				{modules.map((module, index) => (
					<Card key={module.id} className="overflow-hidden">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3 flex-1">
									<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-body font-semibold">
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<CardTitle className="text-h3">{module.title}</CardTitle>
										<CardDescription>
											{module.lessonCount || 0} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
										</CardDescription>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Link href={`/dashboard/modules/${module.id}`}>
										<Button 
											variant="outline"
											size="sm"
											className="border-primary/20 hover:bg-primary/10 hover:border-primary/40"
											title="Open module to add and manage lessons"
										>
											<ExternalLink className="h-5 w-5 mr-2 text-primary" />
											Manage Lessons
										</Button>
									</Link>
									<Button
										variant="outline"
										size="sm"
										onClick={() => removeModule(module.id)}
										className="border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive"
										disabled={loading}
										title="Delete this module and all its lessons"
									>
										<Trash2 className="h-5 w-5 mr-2 fill-destructive text-destructive" />
										Delete
									</Button>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>

			{modules.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-4">
							No modules yet. Add modules to structure your course content.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
