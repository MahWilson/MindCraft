'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';

export default function EditCoursePage() {
	const params = useParams();
	const router = useRouter();
	const courseId = params.id;
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [status, setStatus] = useState('draft');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		// Wait for Firebase Auth to initialize
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setError('You must be signed in to edit a course');
					setLoading(false);
					return;
				}

				// Get user role from Firestore
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (!userDoc.exists()) {
					setError('User profile not found');
					setLoading(false);
					return;
				}

				const userData = userDoc.data();
				const currentRole = userData.role;
				const currentUserId = user.uid;

				// Fetch course
				const courseDoc = await getDoc(doc(db, 'courses', courseId));
				
				if (!courseDoc.exists()) {
					setError('Course not found');
					setLoading(false);
					return;
				}

				const course = { id: courseDoc.id, ...courseDoc.data() };
				
				// Check permissions
				const courseCreatedBy = course.createdBy ? String(course.createdBy).trim() : null;
				
				if (currentRole === 'admin') {
					// Admin can edit any course
				} else if (currentRole === 'teacher') {
					// Teachers can only edit their own courses
					if (!courseCreatedBy || courseCreatedBy !== currentUserId) {
						setError('Unauthorized: You can only edit your own courses');
						setLoading(false);
						return;
					}
				} else {
					setError('Unauthorized: Only teachers and admins can edit courses');
					setLoading(false);
					return;
				}

				// Load course data
				setTitle(course.title);
				setDescription(course.description || '');
				setStatus(course.status);
			} catch (err) {
				console.error('Error fetching course:', err);
				setError('Failed to load course');
			} finally {
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [courseId]);

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');

		try {
			await updateDoc(doc(db, 'courses', courseId), {
				title: title.trim(),
				description: description?.trim() || '',
				status: status,
				updatedAt: serverTimestamp(),
			});

			setSuccess('Course updated successfully!');
			setTimeout(() => {
				router.push('/courses');
			}, 1500);
		} catch (err) {
			console.error('Error updating course:', err);
			setError(err.message || 'Failed to update course');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="max-w-2xl mx-auto p-4">Loading...</div>;
	}

	if (error && !title) {
		return (
			<div className="max-w-2xl mx-auto p-4">
				<div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Edit Course</h1>
			<form onSubmit={onSubmit} className="bg-white border rounded-lg p-6 space-y-4">
				<label className="block">
					<span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
					<input
						required
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label className="block">
					<span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
						className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label className="block">
					<span className="block text-sm font-medium text-gray-700 mb-1">Status</span>
					<select
						value={status}
						onChange={(e) => setStatus(e.target.value)}
						className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
					</select>
				</label>

				<div className="pt-4">
					<button
						type="submit"
						disabled={submitting}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{submitting ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
			</form>

			{error && (
				<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
			)}
			{success && (
				<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>
			)}
		</div>
	);
}

