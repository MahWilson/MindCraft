'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

export default function CourseManagement({ course, currentUserId, currentRole }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	// Teachers can delete their own courses (drafts or published), admins can delete any course
	const canDelete =
		currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);

	async function handleDelete() {
		if (!confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
			return;
		}
		setLoading(true);
		setError('');
		try {
			await deleteDoc(doc(db, 'courses', course.id));
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Delete error:', err);
			setError(err.message || 'Failed to delete');
			setLoading(false);
		}
	}

	async function handlePublish() {
		setLoading(true);
		setError('');
		try {
			await updateDoc(doc(db, 'courses', course.id), {
				status: 'published',
				updatedAt: serverTimestamp(),
			});
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Publish error:', err);
			setError(err.message || 'Failed to publish');
			setLoading(false);
		}
	}

	async function handleUnpublish() {
		if (!confirm(`Unpublish "${course.title}"? It will be moved back to draft and taken off the live server.`)) {
			return;
		}
		setLoading(true);
		setError('');
		try {
			await updateDoc(doc(db, 'courses', course.id), {
				status: 'draft',
				updatedAt: serverTimestamp(),
			});
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Unpublish error:', err);
			setError(err.message || 'Failed to unpublish');
			setLoading(false);
		}
	}

	return (
		<div className="bg-white border rounded-lg p-4">
			<h3 className="font-semibold mb-2">{course.title}</h3>
			<p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description || 'No description'}</p>
			<div className="text-xs text-gray-500 mb-3 space-y-1">
				<div>Author: {course.authorName || 'Unknown'}</div>
				<div>Created: {course.createdAt?.toDate ? course.createdAt.toDate().toLocaleDateString() : 'N/A'}</div>
				{course.status === 'published' && (
					<div>Published: {course.updatedAt?.toDate ? course.updatedAt.toDate().toLocaleDateString() : 'N/A'}</div>
				)}
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				{course.status === 'draft' && canEdit && (
					<button
						onClick={handlePublish}
						disabled={loading}
						className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Publish
					</button>
				)}
				{course.status === 'published' && canEdit && (
					<button
						onClick={handleUnpublish}
						disabled={loading}
						className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Unpublish
					</button>
				)}
				{canEdit && (
					<a
						href={`/dashboard/courses/${course.id}/edit`}
						className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
					>
						Edit
					</a>
				)}
				{canDelete && (
					<button
						onClick={handleDelete}
						disabled={loading}
						className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Delete
					</button>
				)}
				<span className={`px-2 py-1 rounded text-xs ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
					{course.status === 'published' ? 'Published' : 'Draft'}
				</span>
			</div>
			{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
		</div>
	);
}

