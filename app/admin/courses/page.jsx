'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import CourseManagement from './CourseManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter, SortAsc, SortDesc, Grid3x3, List, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminCoursesPage() {
	const { language } = useLanguage();
	const [allCourses, setAllCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	
	// Filter states
	const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'draft', 'published'
	const [authorFilter, setAuthorFilter] = useState('all'); // 'all', 'mine' (only for teachers)
	
	// Sort states
	const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'title', 'updatedAt'
	const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
	
	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(12);
	
	// View mode
	const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
	
	// Bulk selection
	const [selectedCourses, setSelectedCourses] = useState(new Set());
	const [bulkActionLoading, setBulkActionLoading] = useState(false);

	// Translations
	const translations = {
		en: {
			pageTitle: 'Manage Courses',
			pageDescription: 'Create, edit, and manage your courses',
			createCourse: 'Create Course',
			loading: 'Loading courses...',
			unauthorized: 'Unauthorized: Admin or Teacher access required',
			searchPlaceholder: 'Search courses by title or description',
			filterByStatus: 'Filter by Status',
			filterByAuthor: 'Filter by Author',
			all: 'All',
			draft: 'Draft',
			published: 'Published',
			myCourses: 'My Courses',
			sortBy: 'Sort By',
			newest: 'Newest First',
			oldest: 'Oldest First',
			titleAZ: 'Title (A-Z)',
			titleZA: 'Title (Z-A)',
			recentlyUpdated: 'Recently Updated',
			itemsPerPage: 'Items per page',
			viewMode: 'View',
			gridView: 'Grid',
			listView: 'List',
			selectAll: 'Select All',
			deselectAll: 'Deselect All',
			bulkActions: 'Bulk Actions',
			bulkPublish: 'Publish Selected',
			bulkUnpublish: 'Unpublish Selected',
			bulkDelete: 'Delete Selected',
			noCourses: 'No courses found',
			showing: 'Showing',
			of: 'of',
			courses: 'courses',
			page: 'Page',
			previous: 'Previous',
			next: 'Next',
		},
		bm: {
			pageTitle: 'Urus Kursus',
			pageDescription: 'Cipta, edit, dan urus kursus anda',
			createCourse: 'Cipta Kursus',
			loading: 'Memuatkan kursus...',
			unauthorized: 'Tidak dibenarkan: Akses Admin atau Guru diperlukan',
			searchPlaceholder: 'Cari kursus mengikut tajuk atau penerangan',
			filterByStatus: 'Tapis mengikut Status',
			filterByAuthor: 'Tapis mengikut Pengarang',
			all: 'Semua',
			draft: 'Draf',
			published: 'Diterbitkan',
			myCourses: 'Kursus Saya',
			sortBy: 'Susun mengikut',
			newest: 'Terbaru',
			oldest: 'Terlama',
			titleAZ: 'Tajuk (A-Z)',
			titleZA: 'Tajuk (Z-A)',
			recentlyUpdated: 'Kemas Kini Terkini',
			itemsPerPage: 'Item setiap halaman',
			viewMode: 'Paparan',
			gridView: 'Grid',
			listView: 'Senarai',
			selectAll: 'Pilih Semua',
			deselectAll: 'Nyahpilih Semua',
			bulkActions: 'Tindakan Pukal',
			bulkPublish: 'Terbitkan Dipilih',
			bulkUnpublish: 'Nyahterbit Dipilih',
			bulkDelete: 'Padam Dipilih',
			noCourses: 'Tiada kursus dijumpai',
			showing: 'Menunjukkan',
			of: 'daripada',
			courses: 'kursus',
			page: 'Halaman',
			previous: 'Sebelumnya',
			next: 'Seterusnya',
		},
	};

	const t = translations[language] || translations.en;

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setLoading(false);
					return;
				}

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
			let coursesQuery;

			if (currentRole === 'admin') {
				coursesQuery = query(
					collection(db, 'course'),
					orderBy('createdAt', 'desc')
				);
			} else {
				if (!currentUserId) {
					setLoading(false);
					return;
				}
				coursesQuery = query(
					collection(db, 'course'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
			}

			const coursesSnap = await getDocs(coursesQuery);
			const courses = coursesSnap.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			setAllCourses(courses);
		} catch (err) {
			console.error('Error loading courses:', err);
			try {
				const allDocs = await getDocs(collection(db, 'course'));
				const all = allDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				if (currentRole === 'admin') {
					setAllCourses(all);
				} else if (currentUserId) {
					setAllCourses(all.filter(c => c.createdBy === currentUserId));
				}
			} catch (fallbackErr) {
				console.error('Fallback query also failed:', fallbackErr);
			}
		} finally {
			setLoading(false);
		}
	}

	// Filter and sort courses
	const filteredAndSortedCourses = useMemo(() => {
		let filtered = [...allCourses];

		// Search filter
		if (searchTerm.trim()) {
			const normalized = searchTerm.trim().toLowerCase();
			filtered = filtered.filter((course) => {
				const title = (course.title || '').toLowerCase();
				const description = (course.description || '').toLowerCase();
				return title.includes(normalized) || description.includes(normalized);
			});
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter(c => c.status === statusFilter);
		}

		// Author filter (only for teachers)
		if (role === 'teacher' && authorFilter === 'mine' && userId) {
			filtered = filtered.filter(c => c.createdBy === userId);
		}

		// Sort
		filtered.sort((a, b) => {
			let aVal, bVal;
			
			if (sortBy === 'title') {
				aVal = (a.title || '').toLowerCase();
				bVal = (b.title || '').toLowerCase();
			} else if (sortBy === 'updatedAt') {
				aVal = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
				bVal = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
			} else { // createdAt
				aVal = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
				bVal = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
			}

			if (sortOrder === 'asc') {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			} else {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			}
		});

		return filtered;
	}, [allCourses, searchTerm, statusFilter, authorFilter, sortBy, sortOrder, role, userId]);

	// Pagination
	const totalPages = Math.ceil(filteredAndSortedCourses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedCourses = filteredAndSortedCourses.slice(startIndex, endIndex);

	useEffect(() => {
		// Reset to page 1 when filters change
		setCurrentPage(1);
		setSelectedCourses(new Set());
	}, [searchTerm, statusFilter, authorFilter, sortBy, sortOrder]);

	// Bulk selection
	function handleSelectAll() {
		if (selectedCourses.size === paginatedCourses.length) {
			setSelectedCourses(new Set());
		} else {
			setSelectedCourses(new Set(paginatedCourses.map(c => c.id)));
		}
	}

	function handleToggleSelect(courseId) {
		const newSelected = new Set(selectedCourses);
		if (newSelected.has(courseId)) {
			newSelected.delete(courseId);
		} else {
			newSelected.add(courseId);
		}
		setSelectedCourses(newSelected);
	}

	// Bulk actions
	async function handleBulkPublish() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Publish ${selectedCourses.size} course(s)?`)) return;

		setBulkActionLoading(true);
		try {
			const batch = writeBatch(db);
			for (const courseId of selectedCourses) {
				const courseRef = doc(db, 'course', courseId);
				batch.update(courseRef, {
					status: 'published',
					updatedAt: serverTimestamp(),
				});
			}
			await batch.commit();
			setSelectedCourses(new Set());
			await loadCoursesForUser(role, userId);
		} catch (err) {
			console.error('Bulk publish error:', err);
			alert('Failed to publish courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	async function handleBulkUnpublish() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Unpublish ${selectedCourses.size} course(s)?`)) return;

		setBulkActionLoading(true);
		try {
			const batch = writeBatch(db);
			for (const courseId of selectedCourses) {
				const courseRef = doc(db, 'course', courseId);
				batch.update(courseRef, {
					status: 'draft',
					updatedAt: serverTimestamp(),
				});
			}
			await batch.commit();
			setSelectedCourses(new Set());
			await loadCoursesForUser(role, userId);
		} catch (err) {
			console.error('Bulk unpublish error:', err);
			alert('Failed to unpublish courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	async function handleBulkDelete() {
		if (selectedCourses.size === 0) return;
		if (!confirm(`Delete ${selectedCourses.size} course(s)? This cannot be undone.`)) return;

		setBulkActionLoading(true);
		try {
			const batch = writeBatch(db);
			for (const courseId of selectedCourses) {
				const courseRef = doc(db, 'course', courseId);
				batch.delete(courseRef);
			}
			await batch.commit();
			setSelectedCourses(new Set());
			await loadCoursesForUser(role, userId);
		} catch (err) {
			console.error('Bulk delete error:', err);
			alert('Failed to delete courses');
		} finally {
			setBulkActionLoading(false);
		}
	}

	function handleCourseDeleted(courseId) {
		setAllCourses(prev => prev.filter(c => c.id !== courseId));
		setSelectedCourses(prev => {
			const newSet = new Set(prev);
			newSet.delete(courseId);
			return newSet;
		});
	}

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

	const allSelected = paginatedCourses.length > 0 && selectedCourses.size === paginatedCourses.length;

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-2">
					<h1 className="text-h1 text-neutralDark">{t.pageTitle}</h1>
					<p className="text-body text-muted-foreground">{t.pageDescription}</p>
				</div>
				<a href="/dashboard/courses/new" className="self-start md:self-auto">
					<Button size="lg">{t.createCourse}</Button>
				</a>
			</div>

			{/* Search and Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="space-y-4">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutralDark" />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder={t.searchPlaceholder}
								className="w-full pl-10"
							/>
						</div>

						{/* Filters and Controls */}
						<div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
							{/* Status Filter */}
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-muted-foreground" />
								<label className="text-caption text-muted-foreground">{t.filterByStatus}:</label>
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="all">{t.all}</option>
									<option value="draft">{t.draft}</option>
									<option value="published">{t.published}</option>
								</select>
							</div>

							{/* Author Filter (only for teachers) */}
							{role === 'teacher' && (
								<div className="flex items-center gap-2">
									<label className="text-caption text-muted-foreground">{t.filterByAuthor}:</label>
									<select
										value={authorFilter}
										onChange={(e) => setAuthorFilter(e.target.value)}
										className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<option value="all">{t.all}</option>
										<option value="mine">{t.myCourses}</option>
									</select>
								</div>
							)}

							{/* Sort */}
							<div className="flex items-center gap-2">
								{sortOrder === 'asc' ? <SortAsc className="h-4 w-4 text-muted-foreground" /> : <SortDesc className="h-4 w-4 text-muted-foreground" />}
								<label className="text-caption text-muted-foreground">{t.sortBy}:</label>
								<select
									value={`${sortBy}-${sortOrder}`}
									onChange={(e) => {
										const [field, order] = e.target.value.split('-');
										setSortBy(field);
										setSortOrder(order);
									}}
									className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="createdAt-desc">{t.newest}</option>
									<option value="createdAt-asc">{t.oldest}</option>
									<option value="title-asc">{t.titleAZ}</option>
									<option value="title-desc">{t.titleZA}</option>
									<option value="updatedAt-desc">{t.recentlyUpdated}</option>
								</select>
							</div>

							{/* Items per page */}
							<div className="flex items-center gap-2 ml-auto">
								<label className="text-caption text-muted-foreground">{t.itemsPerPage}:</label>
								<select
									value={itemsPerPage}
									onChange={(e) => {
										setItemsPerPage(Number(e.target.value));
										setCurrentPage(1);
									}}
									className="px-3 py-1 rounded-lg border border-input bg-background text-body text-neutralDark focus:outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="12">12</option>
									<option value="24">24</option>
									<option value="48">48</option>
								</select>
							</div>

							{/* View mode */}
							<div className="flex items-center gap-3 border-l border-border pl-4">
								<label className="text-body font-medium text-neutralDark">{t.viewMode}:</label>
								<div className="flex gap-2">
									<Button
										variant={viewMode === 'grid' ? 'default' : 'outline'}
										size="default"
										onClick={() => setViewMode('grid')}
										className="flex items-center gap-2 px-4 py-2"
									>
										<Grid3x3 className="h-5 w-5" />
										<span className="text-body font-medium">{t.gridView}</span>
									</Button>
									<Button
										variant={viewMode === 'list' ? 'default' : 'outline'}
										size="default"
										onClick={() => setViewMode('list')}
										className="flex items-center gap-2 px-4 py-2"
									>
										<List className="h-5 w-5" />
										<span className="text-body font-medium">{t.listView}</span>
									</Button>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Bulk Actions */}
			{selectedCourses.size > 0 && (
				<Card className="border-primary bg-primary/5">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between flex-wrap gap-4">
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="sm"
									onClick={handleSelectAll}
								>
									{allSelected ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
									{allSelected ? t.deselectAll : t.selectAll}
								</Button>
								<span className="text-body text-neutralDark">
									{selectedCourses.size} {selectedCourses.size === 1 ? t.course : t.courses} selected
								</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<Button
									variant="outline"
									size="sm"
									onClick={handleBulkPublish}
									disabled={bulkActionLoading}
								>
									{t.bulkPublish}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleBulkUnpublish}
									disabled={bulkActionLoading}
								>
									{t.bulkUnpublish}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={handleBulkDelete}
									disabled={bulkActionLoading}
								>
									{t.bulkDelete}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Courses List */}
			{paginatedCourses.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">{t.noCourses}</p>
					</CardContent>
				</Card>
			) : (
				<>
					{viewMode === 'grid' ? (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{paginatedCourses.map((course) => (
								<div key={course.id} className="relative">
									{selectedCourses.has(course.id) && (
										<div className="absolute top-2 right-2 z-10">
											<CheckSquare className="h-5 w-5 text-primary" />
										</div>
									)}
									<div
										className={`cursor-pointer ${selectedCourses.has(course.id) ? 'ring-2 ring-primary' : ''}`}
										onClick={() => handleToggleSelect(course.id)}
									>
										<CourseManagement
											course={course}
											currentUserId={userId}
											currentRole={role}
											onDeleted={handleCourseDeleted}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="space-y-4">
							{paginatedCourses.map((course) => (
								<div key={course.id} className="relative">
									{selectedCourses.has(course.id) && (
										<div className="absolute top-2 right-2 z-10">
											<CheckSquare className="h-5 w-5 text-primary" />
										</div>
									)}
									<div
										className={`cursor-pointer ${selectedCourses.has(course.id) ? 'ring-2 ring-primary' : ''}`}
										onClick={() => handleToggleSelect(course.id)}
									>
										<CourseManagement
											course={course}
											currentUserId={userId}
											currentRole={role}
											onDeleted={handleCourseDeleted}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center justify-between flex-wrap gap-4">
							<div className="text-body text-muted-foreground">
								{t.showing} {startIndex + 1}-{Math.min(endIndex, filteredAndSortedCourses.length)} {t.of} {filteredAndSortedCourses.length} {t.courses}
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4 mr-1" />
									{t.previous}
								</Button>
								<div className="flex items-center gap-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}
										return (
											<Button
												key={pageNum}
												variant={currentPage === pageNum ? 'default' : 'outline'}
												size="sm"
												onClick={() => setCurrentPage(pageNum)}
											>
												{pageNum}
											</Button>
										);
									})}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
								>
									{t.next}
									<ChevronRight className="h-4 w-4 ml-1" />
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
