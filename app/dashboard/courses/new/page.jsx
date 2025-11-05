'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function NewCoursePage() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [publish, setPublish] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [userRole, setUserRole] = useState(null);
	const router = useRouter();

	useEffect(() => {
		// Get user role on mount
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			}
		});
		return () => unsubscribe();
	}, []);

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');

		// Check if user is authenticated
		const user = auth.currentUser;
		if (!user) {
			setError('You must be signed in to create a course');
			setSubmitting(false);
			return;
		}

		try {
			// Get user profile to get name and role
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			const userData = userDoc.exists() ? userDoc.data() : null;
			
			if (!userData || (userData.role !== 'admin' && userData.role !== 'teacher')) {
				setError('Only teachers and admins can create courses');
				setSubmitting(false);
				return;
			}

			// Create course in Firestore
			const courseData = {
				title: title.trim(),
				description: description?.trim() || '',
				status: publish ? 'published' : 'draft',
				modules: [],
				createdBy: user.uid,
				authorName: userData.name || 'Unknown',
				authorEmail: user.email || '',
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const docRef = await addDoc(collection(db, 'courses'), courseData);
			
			const isPublished = publish;
			setSuccess(
				isPublished
					? `Course "${title}" published successfully!`
					: `Course "${title}" saved as draft. You can continue editing and publish when ready.`
			);

			// Clear form fields
			setTitle('');
			setDescription('');
			setPublish(false);

			// Redirect based on role - use window.location to force full page reload
			setTimeout(() => {
				if (userRole === 'admin' || userRole === 'teacher') {
					window.location.href = '/admin/courses';
				} else {
					window.location.href = '/courses';
				}
			}, 2000);
		} catch (err) {
			console.error('Course creation error:', err);
			setError(err.message || 'Failed to save course');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Create Course</h1>
			<form onSubmit={onSubmit} className="bg-white border rounded-lg p-6 space-y-4">
				<label className="block">
					<span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
					<input
						required
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Enter course title"
					/>
				</label>

				<label className="block">
					<span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
						className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Enter course description"
					/>
				</label>

			<label className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={publish}
					onChange={(e) => setPublish(e.target.checked)}
					className="w-4 h-4"
				/>
				<span className="text-sm text-gray-700">Publish immediately</span>
			</label>

				<div className="pt-4">
					<button
						type="submit"
						disabled={submitting}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{submitting ? 'Saving…' : 'Save Course'}
					</button>
				</div>
			</form>

			{error && (
				<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
					{error}
				</div>
			)}
			{success && (
				<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
					{success}
				</div>
			)}
		</div>
	);
}


