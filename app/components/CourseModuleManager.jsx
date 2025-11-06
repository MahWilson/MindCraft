'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ChevronDown, ChevronUp, ExternalLink, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';

export default function CourseModuleManager({ courseId, initialModules = [], onModulesChange }) {
	const [modules, setModules] = useState([]);
	const [expandedModules, setExpandedModules] = useState({});
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [loading, setLoading] = useState(false);
	const [showModuleLibrary, setShowModuleLibrary] = useState(false);
	const [moduleLibrary, setModuleLibrary] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');

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
			const response = await fetch(`/api/modules?courseId=${courseId}`);
			const data = await response.json();
			
			if (data.modules) {
				// Load lesson counts for each module
				const modulesWithLessonCounts = await Promise.all(
					data.modules.map(async (module) => {
						let lessonCount = 0;
						if (module.lessons && module.lessons.length > 0) {
							try {
								const lessonsResponse = await fetch(`/api/lessons?moduleId=${module.id}`);
								const lessonsData = await lessonsResponse.json();
								lessonCount = lessonsData.lessons?.length || 0;
							} catch (err) {
								console.error('Error loading lessons for module:', err);
							}
						}
						return {
							...module,
							lessonCount,
						};
					})
				);
				setModules(modulesWithLessonCounts);
				
				// Auto-expand first module if there are modules
				if (modulesWithLessonCounts.length > 0 && Object.keys(expandedModules).length === 0) {
					setExpandedModules({ [modulesWithLessonCounts[0].id]: true });
				}
			}
		} catch (err) {
			console.error('Error loading modules:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadModuleLibrary() {
		setLoading(true);
		try {
			const response = await fetch('/api/modules');
			const data = await response.json();
			
			if (data.modules) {
				// Filter out modules already in this course
				const currentModuleIds = new Set(modules.map(m => m.id));
				const availableModules = data.modules.filter(m => !currentModuleIds.has(m.id));
				
				// Load lesson counts
				const modulesWithCounts = await Promise.all(
					availableModules.map(async (module) => {
						let lessonCount = 0;
						if (module.lessons && module.lessons.length > 0) {
							try {
								const lessonsResponse = await fetch(`/api/lessons?moduleId=${module.id}`);
								const lessonsData = await lessonsResponse.json();
								lessonCount = lessonsData.lessons?.length || 0;
							} catch (err) {
								// Ignore errors
							}
						}
						return {
							...module,
							lessonCount,
						};
					})
				);
				
				setModuleLibrary(modulesWithCounts);
			}
		} catch (err) {
			console.error('Error loading module library:', err);
		} finally {
			setLoading(false);
		}
	}

	async function addModule() {
		if (!newModuleTitle.trim()) return;

		setLoading(true);
		try {
			if (courseId) {
				// Create module and link to course
				const response = await fetch('/api/modules', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: newModuleTitle.trim(),
						order: modules.length,
						courseId, // Link to course
					}),
				});

				const data = await response.json();
				if (!response.ok) throw new Error(data.error);

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

	async function addExistingModule(moduleId) {
		if (!courseId) {
			alert('Please save the course first before adding existing modules');
			return;
		}

		setLoading(true);
		try {
			const response = await fetch(`/api/courses/${courseId}/modules`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ moduleId }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}

			// Reload modules
			await loadModules();
			setShowModuleLibrary(false);
			setSearchTerm('');
		} catch (err) {
			console.error('Error adding existing module:', err);
			alert(err.message || 'Failed to add module');
		} finally {
			setLoading(false);
		}
	}

	async function removeModule(moduleId) {
		if (!confirm('Remove this module from the course? (The module itself will not be deleted)')) return;

		setLoading(true);
		try {
			if (courseId && !moduleId.startsWith('temp-')) {
				// Remove module from course
				const response = await fetch(`/api/courses/${courseId}/modules?moduleId=${moduleId}`, {
					method: 'DELETE',
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error);
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

	function toggleModuleLibrary() {
		if (!showModuleLibrary) {
			loadModuleLibrary();
		}
		setShowModuleLibrary(!showModuleLibrary);
	}

	const filteredLibrary = moduleLibrary.filter(m =>
		m.title.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading && modules.length === 0) {
		return <p className="text-body text-muted-foreground">Loading modules...</p>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-h3 text-neutralDark">Modules & Lessons (Optional)</h3>
				<p className="text-caption text-muted-foreground">You can add these later</p>
			</div>

			{/* Add Module */}
			<div className="flex gap-2">
				<Input
					value={newModuleTitle}
					onChange={(e) => setNewModuleTitle(e.target.value)}
					placeholder="Module title (e.g., 'Introduction to Python')"
					className="flex-1"
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addModule();
						}
					}}
				/>
				<Button onClick={addModule} disabled={loading || !newModuleTitle.trim()}>
					<Plus className="h-4 w-4 mr-2" />
					Add New Module
				</Button>
				{courseId && (
					<Button onClick={toggleModuleLibrary} variant="outline" disabled={loading}>
						<Search className="h-4 w-4 mr-2" />
						{showModuleLibrary ? 'Hide' : 'Browse'} Library
					</Button>
				)}
			</div>

			{/* Module Library */}
			{showModuleLibrary && (
				<Card className="border-primary/20">
					<CardHeader>
						<CardTitle className="text-h3">Module Library</CardTitle>
						<CardDescription>Add existing modules to this course</CardDescription>
						<div className="mt-4">
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Search modules..."
								className="w-full"
							/>
						</div>
					</CardHeader>
					<CardContent>
						{filteredLibrary.length === 0 ? (
							<p className="text-body text-muted-foreground text-center py-4">
								{searchTerm ? 'No modules found matching your search.' : 'No modules available in library.'}
							</p>
						) : (
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{filteredLibrary.map((module) => (
									<div
										key={module.id}
										className="flex items-center justify-between p-3 rounded-lg border border-border bg-neutralLight"
									>
										<div className="flex-1 min-w-0">
											<p className="text-body font-medium text-neutralDark">{module.title}</p>
											<p className="text-caption text-muted-foreground">
												{module.lessonCount || 0} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Link href={`/dashboard/modules/${module.id}`}>
												<Button variant="ghost" size="sm">
													<ExternalLink className="h-4 w-4" />
												</Button>
											</Link>
											<Button
												size="sm"
												onClick={() => addExistingModule(module.id)}
												disabled={loading}
											>
												Add
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}

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
										<Button variant="ghost" size="sm">
											<ExternalLink className="h-4 w-4 mr-2" />
											Manage Lessons
										</Button>
									</Link>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => removeModule(module.id)}
										className="text-error hover:text-error"
										disabled={loading}
									>
										<Trash2 className="h-4 w-4" />
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
