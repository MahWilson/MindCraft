'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

export default function CourseCard({ course, currentUserId, currentRole }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	const isPublished = course.status === 'published';

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
			router.refresh();
		} catch (err) {
			setError(err.message || 'Failed to unpublish');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="bg-white border rounded-lg p-4">
			<h2 className="font-semibold mb-2">{course.title}</h2>
			<p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description || 'No description'}</p>
			<div className="text-xs text-gray-500 mb-2">
				<div>By: {course.authorName || 'Unknown'}</div>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				{course.status === 'draft' && course.createdBy === currentUserId && (
					<Link
						href={`/dashboard/courses/${course.id}/edit`}
						className="text-xs text-blue-600 hover:underline"
					>
						Continue editing →
					</Link>
				)}
				{isPublished && canEdit && (
					<button
						onClick={handleUnpublish}
						disabled={loading}
						className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Unpublish
					</button>
				)}
				<span className={`px-2 py-1 rounded text-xs ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
					{isPublished ? 'Published' : 'Draft'}
				</span>
			</div>
			{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
		</div>
	);
}

