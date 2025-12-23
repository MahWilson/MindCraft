'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ModulesPage() {
	const { language } = useLanguage();
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [newModuleTitle, setNewModuleTitle] = useState('');
	const [creating, setCreating] = useState(false);
	const [role, setRole] = useState(null);
	const router = useRouter();

	// Translations
	const translations = {
		en: {
			pageTitle: 'Module Library',
			pageDescription: 'Create and manage modules that can be shared across multiple courses',
			createNewModule: 'Create New Module',
			createDescription: 'Build a new module that can be added to any course',
			moduleTitlePlaceholder: "Module title (e.g., 'Introduction to Python')",
			createModule: 'Create Module',
			searchPlaceholder: 'Search modules...',
			allModules: 'All Modules',
			module: 'module',
			modules: 'modules',
			lesson: 'lesson',
			lessons: 'lessons',
			created: 'Created',
			recently: 'Recently',
			manageLessons: 'Manage Lessons',
			loading: 'Loading modules...',
			noModulesFound: 'No modules found matching your search.',
			noModulesYet: 'No modules in the library yet. Create your first module!',
			deleteConfirm: 'Delete this module and all its lessons? This action cannot be undone.',
			createError: 'You must be signed in to create a module',
			createFailed: 'Failed to create module',
			deleteFailed: 'Failed to delete module',
		},
		bm: {
			pageTitle: 'Perpustakaan Modul',
			pageDescription: 'Cipta dan urus modul yang boleh dikongsi merentas pelbagai kursus',
			createNewModule: 'Cipta Modul Baru',
			createDescription: 'Bina modul baharu yang boleh ditambah ke mana-mana kursus',
			moduleTitlePlaceholder: "Tajuk modul (cth., 'Pengenalan kepada Python')",
			createModule: 'Cipta Modul',
			searchPlaceholder: 'Cari modul...',
			allModules: 'Semua Modul',
			module: 'modul',
			modules: 'modul',
			lesson: 'pelajaran',
			lessons: 'pelajaran',
			created: 'Dicipta',
			recently: 'Baru-baru ini',
			manageLessons: 'Urus Pelajaran',
			loading: 'Memuatkan modul...',
			noModulesFound: 'Tiada modul ditemui yang sepadan dengan carian anda.',
			noModulesYet: 'Tiada modul dalam perpustakaan lagi. Cipta modul pertama anda!',
			deleteConfirm: 'Padam modul ini dan semua pelajarannya? Tindakan ini tidak boleh dibatalkan.',
			createError: 'Anda mesti log masuk untuk mencipta modul',
			createFailed: 'Gagal mencipta modul',
			deleteFailed: 'Gagal memadam modul',
		},
	};

	const t = translations[language] || translations.en;

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
			// Load modules directly from Firestore (client-side with Firebase Auth)
			const modulesQuery = query(
				collection(db, 'module'),
				orderBy('createdAt', 'desc')
			);

			const snapshot = await getDocs(modulesQuery);
			const loadedModules = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Load lesson counts for each module
			const modulesWithCounts = await Promise.all(
				loadedModules.map(async (module) => {
					let lessonCount = 0;
					
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
					};
				})
			);
			
			setModules(modulesWithCounts);
		} catch (err) {
			console.error('Error loading modules:', err);
			console.error('Error details:', {
				code: err.code,
				message: err.message
			});
			// If orderBy fails, try without it
			if (err.code === 'failed-precondition' || err.message?.includes('index')) {
				try {
					console.log('Retrying without orderBy...');
					const snapshot = await getDocs(collection(db, 'module'));
					const loadedModules = snapshot.docs.map(doc => ({
						id: doc.id,
						...doc.data(),
					}));
					
					// Sort by createdAt manually if available
					loadedModules.sort((a, b) => {
						const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
						const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
						return bTime - aTime; // Descending
					});
					
					// Load lesson counts
					const modulesWithCounts = await Promise.all(
						loadedModules.map(async (module) => {
							let lessonCount = 0;
							try {
								const { collection, query, where, getDocs } = await import('firebase/firestore');
								const lessonsQuery = query(
									collection(db, 'lesson'),
									where('moduleId', '==', module.id)
								);
								const lessonsSnapshot = await getDocs(lessonsQuery);
								lessonCount = lessonsSnapshot.size;
							} catch (lessonErr) {
								if (module.lessons && Array.isArray(module.lessons)) {
									lessonCount = module.lessons.length;
								}
							}
							return {
								...module,
								lessonCount,
							};
						})
					);
					
					setModules(modulesWithCounts);
				} catch (fallbackErr) {
					console.error('Fallback also failed:', fallbackErr);
				}
			}
		} finally {
			setLoading(false);
		}
	}

	async function createModule() {
		if (!newModuleTitle.trim()) return;

		setCreating(true);
		try {
			// Check authentication
			if (!auth.currentUser) {
				throw new Error(t.createError);
			}

			// Create module directly in Firestore (client-side with Firebase Auth)
			const moduleData = {
				title: newModuleTitle.trim(),
				order: 0,
				lessons: [],
				createdBy: auth.currentUser.uid, // Track module owner
				collaborators: [], // Reserved for future collaboration features
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(db, 'module'), moduleData);

			// Reload modules
			await loadModules();
			setNewModuleTitle('');
		} catch (err) {
			console.error('Error creating module:', err);
			alert(err.message || t.createFailed);
		} finally {
			setCreating(false);
		}
	}

	async function deleteModule(moduleId) {
		if (!confirm(t.deleteConfirm)) return;

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
			alert(err.message || t.deleteFailed);
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
				<p className="text-body text-muted-foreground">{t.loading}</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">{t.pageTitle}</h1>
				<p className="text-body text-muted-foreground">
					{t.pageDescription}
				</p>
			</div>

			{/* Create New Module */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">{t.createNewModule}</CardTitle>
					<CardDescription>{t.createDescription}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							value={newModuleTitle}
							onChange={(e) => setNewModuleTitle(e.target.value)}
							placeholder={t.moduleTitlePlaceholder}
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
							{t.createModule}
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
					placeholder={t.searchPlaceholder}
					className="pl-10"
				/>
			</div>

			{/* Modules Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-h2 text-neutralDark">{t.allModules}</h2>
					<p className="text-body text-muted-foreground">
						{filteredModules.length} {filteredModules.length === 1 ? t.module : t.modules}
					</p>
				</div>

				{filteredModules.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center py-8">
								<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
								<p className="text-body text-muted-foreground">
									{searchTerm ? t.noModulesFound : t.noModulesYet}
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
												{module.lessonCount || 0} {module.lessonCount === 1 ? t.lesson : t.lessons}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-caption text-muted-foreground">
										<BookOpen className="h-4 w-4" />
										<span>
											{t.created} {module.createdAt?.toDate ? 
												new Date(module.createdAt.toDate()).toLocaleDateString() : 
												t.recently}
										</span>
									</div>

									<div className="flex items-center gap-2 pt-2 border-t border-border">
										<Link href={`/dashboard/modules/${module.id}`} className="flex-1">
											<Button variant="default" className="w-full">
												<ExternalLink className="h-4 w-4 mr-2" />
												{t.manageLessons}
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

