'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ModulesPage() {
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [creating, setCreating] = useState(false);
	const [role, setRole] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const userRole = userDoc.data().role;
					setRole(userRole);
					
					// Only teachers and admins can access
					if (userRole !== 'teacher' && userRole !== 'admin') {
						router.push('/dashboard/student');
					}
				}
			}
		});
		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (role === 'teacher' || role === 'admin') {
			loadModules();
		}
	}, [role]);

	async function loadModules() {
		setLoading(true);
		try {
			const response = await fetch('/api/modules');
			const data = await response.json();
			
			if (data.modules) {
				// Load lesson counts for each module
				const modulesWithCounts = await Promise.all(
					data.modules.map(async (module) => {
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
				setModules(modulesWithCounts);
			}
		} catch (err) {
			console.error('Error loading modules:', err);
		} finally {
			setLoading(false);
		}
	}

	async function createModule() {
		if (!newModuleTitle.trim()) return;

		setCreating(true);
		try {
			const response = await fetch('/api/modules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newModuleTitle.trim(),
					order: 0,
				}),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error);

			// Reload modules
			await loadModules();
			setNewModuleTitle('');
		} catch (err) {
			console.error('Error creating module:', err);
			alert(err.message || 'Failed to create module');
		} finally {
			setCreating(false);
		}
	}

	async function deleteModule(moduleId) {
		if (!confirm('Delete this module and all its lessons? This action cannot be undone.')) return;

		setLoading(true);
		try {
			const response = await fetch(`/api/modules/${moduleId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}

			// Reload modules
			await loadModules();
		} catch (err) {
			console.error('Error deleting module:', err);
			alert(err.message || 'Failed to delete module');
		} finally {
			setLoading(false);
		}
	}

	const filteredModules = modules.filter(module =>
		module.title.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading && modules.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading modules...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Module Library</h1>
				<p className="text-body text-muted-foreground">
					Create and manage modules that can be shared across multiple courses
				</p>
			</div>

			{/* Create New Module */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">Create New Module</CardTitle>
					<CardDescription>Build a new module that can be added to any course</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							value={newModuleTitle}
							onChange={(e) => setNewModuleTitle(e.target.value)}
							placeholder="Module title (e.g., 'Introduction to Python')"
							className="flex-1"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									createModule();
								}
							}}
						/>
						<Button onClick={createModule} disabled={creating || !newModuleTitle.trim()}>
							<Plus className="h-4 w-4 mr-2" />
							Create Module
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Search modules..."
					className="pl-10"
				/>
			</div>

			{/* Modules Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-h2 text-neutralDark">All Modules</h2>
					<p className="text-body text-muted-foreground">
						{filteredModules.length} {filteredModules.length === 1 ? 'module' : 'modules'}
					</p>
				</div>

				{filteredModules.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center py-8">
								<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
								<p className="text-body text-muted-foreground">
									{searchTerm ? 'No modules found matching your search.' : 'No modules in the library yet. Create your first module!'}
								</p>
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredModules.map((module) => (
							<Card key={module.id} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<CardTitle className="text-h3 mb-2 line-clamp-2">{module.title}</CardTitle>
											<CardDescription>
												{module.lessonCount || 0} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-caption text-muted-foreground">
										<BookOpen className="h-4 w-4" />
										<span>
											Created {module.createdAt?.toDate ? 
												new Date(module.createdAt.toDate()).toLocaleDateString() : 
												'Recently'}
										</span>
									</div>

									<div className="flex items-center gap-2 pt-2 border-t border-border">
										<Link href={`/dashboard/modules/${module.id}`} className="flex-1">
											<Button variant="default" className="w-full">
												<ExternalLink className="h-4 w-4 mr-2" />
												Manage Lessons
											</Button>
										</Link>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => deleteModule(module.id)}
											className="text-error hover:text-error"
											disabled={loading}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

