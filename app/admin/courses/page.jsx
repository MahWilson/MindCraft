'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import CourseManagement from './CourseManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminCoursesPage() {
	const [draftCourses, setDraftCourses] = useState([]);
	const [publishedCourses, setPublishedCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);

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

	if (role !== 'admin' && role !== 'teacher') {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">Unauthorized: Admin or Teacher access required</p>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading courses...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Manage Courses</h1>
					<p className="text-body text-muted-foreground">Create, edit, and manage your courses</p>
				</div>
				<a href="/dashboard/courses/new">
					<Button size="lg">Create Course</Button>
				</a>
			</div>

			{/* Draft Courses */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-h2 text-neutralDark">Draft Courses</h2>
					<span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-caption font-medium">
						{draftCourses.length} {draftCourses.length === 1 ? 'draft' : 'drafts'}
					</span>
				</div>
				{draftCourses.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<p className="text-body text-muted-foreground text-center py-8">No draft courses yet</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{draftCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>

			{/* Published Courses */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-h2 text-neutralDark">Published Courses</h2>
					<span className="px-3 py-1 rounded-full bg-success/10 text-success text-caption font-medium">
						{publishedCourses.length} {publishedCourses.length === 1 ? 'course' : 'courses'}
					</span>
				</div>
				{publishedCourses.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<p className="text-body text-muted-foreground text-center py-8">No published courses yet</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{publishedCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
