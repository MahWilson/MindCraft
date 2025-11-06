'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading courses...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-h1 text-neutralDark mb-4">Explore Courses</h1>
				<p className="text-body text-muted-foreground">
					Browse our collection of programming courses. Sign in to enroll and access full content.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{courses.map((course) => (
					<Card key={course.id} className="hover:scale-105 transition-transform duration-200">
						<CardHeader>
							<CardTitle className="text-h3">{course.title}</CardTitle>
							<CardDescription>{course.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<span className="text-caption text-muted-foreground capitalize">{course.status}</span>
								<Link href="/login">
									<Button variant="ghost" size="sm">
										Sign in to enroll →
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="mt-12 bg-primary/5 border-primary/20">
				<CardContent className="pt-6 text-center">
					<h2 className="text-h2 text-neutralDark mb-3">Ready to start learning?</h2>
					<p className="text-body text-muted-foreground mb-6">
						Sign in to access full course content, assessments, and track your progress.
					</p>
					<Link href="/login">
						<Button size="lg">
							Sign In Now
						</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
