'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ModulesPage() {
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [role, setRole] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'user', user.uid));
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
			// Load all modules with their course information
			const snapshot = await getDocs(collection(db, 'module'));
			const loadedModules = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Load course info and lesson counts for each module
			const modulesWithDetails = await Promise.all(
				loadedModules.map(async (module) => {
					let lessonCount = 0;
					let courseTitle = 'Unknown Course';
					
					// Load course information
					if (module.courseId) {
						try {
							const courseDoc = await getDoc(doc(db, 'course', module.courseId));
							if (courseDoc.exists()) {
								courseTitle = courseDoc.data().title || 'Unknown Course';
							}
						} catch (courseErr) {
							console.error(`Error loading course ${module.courseId}:`, courseErr);
						}
					}
					
					// Try to get lessons count from Firestore query
					try {
						const { collection, query, where, getDocs } = await import('firebase/firestore');
						const lessonsQuery = query(
							collection(db, 'lesson'),
							where('moduleId', '==', module.id)
						);
						const lessonsSnapshot = await getDocs(lessonsQuery);
						lessonCount = lessonsSnapshot.size;
					} catch (lessonErr) {
						// Fallback: use length of lessons array if it exists
						if (module.lessons && Array.isArray(module.lessons)) {
							lessonCount = module.lessons.length;
						}
					}
					
					return {
						...module,
						lessonCount,
						courseTitle,
					};
				})
			);
			
			// Sort by course title, then by order
			modulesWithDetails.sort((a, b) => {
				if (a.courseTitle !== b.courseTitle) {
					return a.courseTitle.localeCompare(b.courseTitle);
				}
				return (a.order || 0) - (b.order || 0);
			});
			
			setModules(modulesWithDetails);
		} catch (err) {
			console.error('Error loading modules:', err);
		} finally {
			setLoading(false);
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
				const errorMessage = data.error || data.details || 'Failed to delete module';
				throw new Error(errorMessage);
			}

			// Reload modules
			await loadModules();
		} catch (err) {
			console.error('Error deleting module:', err);
			alert(err.message || 'Failed to delete module. Please check the console for details.');
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
				<h1 className="text-h1 text-neutralDark mb-2">All Modules</h1>
				<p className="text-body text-muted-foreground">
					View all modules across all courses. Modules are organized within their courses.
				</p>
			</div>

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
								<BookOpen className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
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
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<CardTitle className="text-h3 mb-2 line-clamp-2">{module.title}</CardTitle>
												<CardDescription>
													{module.lessonCount || 0} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
												</CardDescription>
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-caption text-muted-foreground">
										<BookOpen className="h-5 w-5" />
										<span className="font-medium text-neutralDark">{module.courseTitle || 'No Course'}</span>
									</div>
									<div className="text-caption text-muted-foreground">
										Created {module.createdAt?.toDate ? 
											new Date(module.createdAt.toDate()).toLocaleDateString() : 
											'Recently'}
									</div>

									<div className="flex items-center gap-2 pt-2 border-t border-border">
										{module.courseId ? (
											<Link href={`/dashboard/courses/${module.courseId}/edit`} className="flex-1">
												<Button variant="outline" className="w-full">
													<ExternalLink className="h-5 w-5 mr-2" />
													View Course
												</Button>
											</Link>
										) : null}
										<Link href={`/dashboard/modules/${module.id}`} className="flex-1">
											<Button variant="default" className="w-full">
												<ExternalLink className="h-5 w-5 mr-2" />
												Manage Lessons
											</Button>
										</Link>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => deleteModule(module.id)}
											className="text-error hover:text-error"
											disabled={loading}
											title="Delete module"
										>
											<Trash2 className="h-5 w-5" />
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

