'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CourseCard from '../CourseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function ExploreCoursesPage() {
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userId, setUserId] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
			}
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		async function loadCourses() {
			try {
				// Only load published courses for exploration
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

	// Filter courses by search term
	const filteredCourses = courses.filter(course => 
		course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
		(course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading courses...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<div className="flex items-center gap-3 mb-4">
					<Link href="/courses">
						<Button variant="ghost" size="sm">← Back to My Courses</Button>
					</Link>
				</div>
				<div className="flex items-center justify-between gap-4">
					<div>
						<h1 className="text-h1 text-neutralDark mb-2">Explore Courses</h1>
						<p className="text-body text-muted-foreground">
							Discover and enroll in new courses to expand your learning
						</p>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<input
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Search courses by title or description..."
					className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200"
				/>
			</div>

			{filteredCourses.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">
							{searchTerm ? 'No courses found matching your search.' : 'No published courses available at the moment.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					<div className="flex items-center justify-between">
						<p className="text-body text-muted-foreground">
							{filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} found
						</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredCourses.map((c) => (
							<CourseCard key={c.id} course={c} currentUserId={userId} currentRole="student" />
						))}
					</div>
				</>
			)}
		</div>
	);
}

