'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CourseCard from './CourseCard';

function getUserRole() {
	if (typeof document === 'undefined') return null;
	const cookies = document.cookie.split(';');
	const roleCookie = cookies.find((c) => c.trim().startsWith('user_role='));
	return roleCookie ? roleCookie.split('=')[1] : null;
}

function getUserId() {
	if (typeof document === 'undefined') return null;
	const cookies = document.cookie.split(';');
	const userIdCookie = cookies.find((c) => c.trim().startsWith('user_id='));
	if (!userIdCookie) return null;
	const value = userIdCookie.split('=').slice(1).join('=').trim();
	return decodeURIComponent(value);
}

export default function CoursesPage() {
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);

	useEffect(() => {
		async function loadCourses() {
			try {
				const currentRole = getUserRole();
				const currentUserId = getUserId();
				setRole(currentRole || 'guest');
				setUserId(currentUserId);

				// Build query based on role
				let coursesQuery;
				if (currentRole === 'admin') {
					// Admins see all courses
					coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
				} else if (currentRole === 'teacher') {
					// Teachers see published + their own drafts
					const publishedQuery = query(
						collection(db, 'courses'),
						where('status', '==', 'published'),
						orderBy('createdAt', 'desc')
					);
					const myDraftsQuery = query(
						collection(db, 'courses'),
						where('status', '==', 'draft'),
						where('createdBy', '==', currentUserId),
						orderBy('createdAt', 'desc')
					);
					
					const [publishedSnap, draftsSnap] = await Promise.all([
						getDocs(publishedQuery),
						currentUserId ? getDocs(myDraftsQuery) : Promise.resolve({ docs: [] })
					]);
					
					const allCourses = [
						...publishedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
						...draftsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
					];
					setCourses(allCourses);
					setLoading(false);
					return;
				} else {
					// Students/guests only see published
					coursesQuery = query(
						collection(db, 'courses'),
						where('status', '==', 'published'),
						orderBy('createdAt', 'desc')
					);
				}

				const snapshot = await getDocs(coursesQuery);
				const coursesList = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data()
				}));
				setCourses(coursesList);
			} catch (err) {
				console.error('Error loading courses:', err);
			} finally {
				setLoading(false);
			}
		}
		loadCourses();
	}, []);

	const canCreate = role === 'admin' || role === 'teacher';

	if (loading) {
		return <div className="p-4">Loading courses...</div>;
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-xl font-bold">Courses</h1>
				{canCreate && (
					<Link href="/dashboard/courses/new" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
						Create Course
					</Link>
				)}
			</div>
			{courses.length === 0 ? (
				<p className="text-gray-500">No courses available</p>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{courses.map((c) => (
						<CourseCard key={c.id} course={c} currentUserId={userId} currentRole={role} />
					))}
				</div>
			)}
		</div>
	);
}
