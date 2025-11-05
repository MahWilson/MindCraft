'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import CourseManagement from './CourseManagement';

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
				const userDoc = await getDoc(doc(db, 'users', user.uid));
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
					collection(db, 'courses'),
					where('status', '==', 'draft'),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'courses'),
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
					collection(db, 'courses'),
					where('status', '==', 'draft'),
					where('createdBy', '==', currentUserId),
					orderBy('createdAt', 'desc')
				);
				publishedQuery = query(
					collection(db, 'courses'),
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
					const allDocs = await getDocs(collection(db, 'courses'));
					const all = allDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
					setDraftCourses(all.filter(c => c.status === 'draft'));
					setPublishedCourses(all.filter(c => c.status === 'published'));
				} else if (currentUserId) {
					const allDocs = await getDocs(collection(db, 'courses'));
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
			<div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
				Unauthorized: Admin or Teacher access required
			</div>
		);
	}

	if (loading) {
		return <div className="p-4">Loading courses...</div>;
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Manage Courses</h1>
				<a href="/dashboard/courses/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
					Create Course
				</a>
			</div>

			{/* Draft Courses */}
			<div className="mb-8">
				<h2 className="text-xl font-semibold mb-4">Draft Courses ({draftCourses.length})</h2>
				{draftCourses.length === 0 ? (
					<p className="text-gray-500 text-sm">No draft courses</p>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{draftCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>

			{/* Published Courses */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Published Courses ({publishedCourses.length})</h2>
				{publishedCourses.length === 0 ? (
					<p className="text-gray-500 text-sm">No published courses</p>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{publishedCourses.map((course) => (
							<CourseManagement key={course.id} course={course} currentUserId={userId} currentRole={role} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
