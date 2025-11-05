'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

export default function ExplorePage() {
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadCourses() {
			try {
				// Only show published courses for guests
				const coursesQuery = query(
					collection(db, 'courses'),
					where('status', '==', 'published'),
					orderBy('createdAt', 'desc')
				);
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

	if (loading) {
		return <div className="p-4">Loading courses...</div>;
	}

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
				<p className="text-gray-600">Browse our collection of programming courses. Sign in to enroll and access full content.</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{courses.map((course) => (
					<div key={course.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold mb-2">{course.title}</h2>
						<p className="text-sm text-gray-600 mb-4">{course.description}</p>
						<div className="flex items-center justify-between">
							<span className="text-xs text-gray-500 capitalize">{course.status}</span>
							<Link href="/login" className="text-sm text-blue-600 hover:underline">
								Sign in to enroll →
							</Link>
						</div>
					</div>
				))}
			</div>

			<div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
				<h2 className="text-xl font-semibold mb-2">Ready to start learning?</h2>
				<p className="text-gray-600 mb-4">Sign in to access full course content, assessments, and track your progress.</p>
				<Link href="/login" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
					Sign In Now
				</Link>
			</div>
		</div>
	);
}
