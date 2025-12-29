'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import CourseManagement from './CourseManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminCoursesPage() {
	const { language } = useLanguage();
	const [draftCourses, setDraftCourses] = useState([]);
	const [publishedCourses, setPublishedCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');

	// Translations
	const translations = {
		en: {
			pageTitle: 'Manage Courses',
			pageDescription: 'Create, edit, and manage your courses',
			createCourse: 'Create Course',
			draftCourses: 'Draft Courses',
			publishedCourses: 'Published Courses',
			draft: 'draft',
			drafts: 'drafts',
			course: 'course',
			courses: 'courses',
			noDraftCourses: 'No draft courses yet',
			noPublishedCourses: 'No published courses yet',
			loading: 'Loading courses...',
			unauthorized: 'Unauthorized: Admin or Teacher access required',
			searchPlaceholder: 'Search courses by title or description',
		},
		bm: {
			pageTitle: 'Urus Kursus',
			pageDescription: 'Cipta, edit, dan urus kursus anda',
			createCourse: 'Cipta Kursus',
			draftCourses: 'Kursus Draf',
			publishedCourses: 'Kursus Diterbitkan',
			draft: 'draf',
			drafts: 'draf',
			course: 'kursus',
			courses: 'kursus',
			noDraftCourses: 'Tiada kursus draf lagi',
			noPublishedCourses: 'Tiada kursus diterbitkan lagi',
			loading: 'Memuatkan kursus...',
			unauthorized: 'Tidak dibenarkan: Akses Admin atau Guru diperlukan',
			searchPlaceholder: 'Cari kursus mengikut tajuk atau penerangan',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		// Wait for Firebase Auth to initialize
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setLoading(false);
					return;
				}

				// Get user role from Firestore
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (!userDoc.exists()) {
					setLoading(false);
					return;
				}

				const userData = userDoc.data();
				const currentRole = userData.role;
				const currentUserId = user.uid;
				
				setRole(currentRole);
				setUserId(currentUserId);

				if (currentRole !== 'admin' && currentRole !== 'teacher') {
					setLoading(false);
					return;
				}

				// Load courses
				await loadCoursesForUser(currentRole, currentUserId);
			} catch (err) {
				console.error('Error in auth state change:', err);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	async function loadCoursesForUser(currentRole, currentUserId) {
		try {
			// Build queries based on role
			let draftsQuery, publishedQuery;

			if (currentRole === 'admin') {
				// Admin sees all courses
				draftsQuery = query(
					collection(db, 'course'),
					where('status', '==', 'draft'),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'course'),
					where('status', '==', 'published'),
					orderBy('createdAt', 'desc')
				);
			} else {
				// Teacher sees only their own courses
				if (!currentUserId) {
					setLoading(false);
					return;
				}
				draftsQuery = query(
					collection(db, 'course'),
					where('status', '==', 'draft'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'course'),
					where('status', '==', 'published'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
			}

			const [draftsSnap, publishedSnap] = await Promise.all([
				getDocs(draftsQuery),
				getDocs(publishedQuery)
			]);

			const drafts = draftsSnap.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			const published = publishedSnap.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			setDraftCourses(drafts);
			setPublishedCourses(published);
		} catch (err) {
			console.error('Error loading courses:', err);
			// If there's an error (like missing index), try without orderBy
			try {
				if (currentRole === 'admin') {
					const allDocs = await getDocs(collection(db, 'course'));
					const all = allDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
					setDraftCourses(all.filter(c => c.status === 'draft'));
					setPublishedCourses(all.filter(c => c.status === 'published'));
				} else if (currentUserId) {
					const allDocs = await getDocs(collection(db, 'course'));
					const all = allDocs.docs
						.map(doc => ({ id: doc.id, ...doc.data() }))
						.filter(c => c.createdBy === currentUserId);
					setDraftCourses(all.filter(c => c.status === 'draft'));
					setPublishedCourses(all.filter(c => c.status === 'published'));
				}
			} catch (fallbackErr) {
				console.error('Fallback query also failed:', fallbackErr);
			}
		} finally {
			setLoading(false);
		}
	}

	const normalizedSearch = searchTerm.trim().toLowerCase();

	const filteredDraftCourses = normalizedSearch
		? draftCourses.filter((course) => {
				const title = (course.title || '').toLowerCase();
				const description = (course.description || '').toLowerCase();
				return title.includes(normalizedSearch) || description.includes(normalizedSearch);
		  })
		: draftCourses;

	const filteredPublishedCourses = normalizedSearch
		? publishedCourses.filter((course) => {
				const title = (course.title || '').toLowerCase();
				const description = (course.description || '').toLowerCase();
				return title.includes(normalizedSearch) || description.includes(normalizedSearch);
		  })
		: publishedCourses;

	if (role !== 'admin' && role !== 'teacher') {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{t.unauthorized}</p>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">{t.loading}</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<h1 className="text-h1 text-neutralDark">{t.pageTitle}</h1>
					<p className="text-body text-muted-foreground">{t.pageDescription}</p>
					<div className="mt-2 max-w-md relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
						<Input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t.searchPlaceholder}
							className="w-full pl-10"
						/>
					</div>
				</div>
				<a href="/dashboard/courses/new" className="self-start md:self-auto">
					<Button size="lg">{t.createCourse}</Button>
				</a>
			</div>

			{/* Draft Courses */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-h2 text-neutralDark">{t.draftCourses}</h2>
					<span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-caption font-medium">
						{filteredDraftCourses.length} {filteredDraftCourses.length === 1 ? t.draft : t.drafts}
					</span>
				</div>
				{filteredDraftCourses.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<p className="text-body text-muted-foreground text-center py-8">{t.noDraftCourses}</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredDraftCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>

			{/* Published Courses */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-h2 text-neutralDark">{t.publishedCourses}</h2>
					<span className="px-3 py-1 rounded-full bg-success/10 text-success text-caption font-medium">
						{filteredPublishedCourses.length} {filteredPublishedCourses.length === 1 ? t.course : t.courses}
					</span>
				</div>
				{filteredPublishedCourses.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<p className="text-body text-muted-foreground text-center py-8">{t.noPublishedCourses}</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredPublishedCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
