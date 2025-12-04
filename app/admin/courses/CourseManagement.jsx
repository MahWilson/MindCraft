'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
			await deleteDoc(doc(db, 'course', course.id));
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
			await updateDoc(doc(db, 'course', course.id), {
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
			await updateDoc(doc(db, 'course', course.id), {
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
		<Card className="card-hover">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-h3 mb-2 line-clamp-2">{course.title}</CardTitle>
						<CardDescription className="line-clamp-2 mb-4">
							{course.description || 'No description provided'}
						</CardDescription>
					</div>
					<span className={`px-3 py-1 rounded-full text-caption font-medium whitespace-nowrap ${
						course.status === 'published' 
							? 'bg-success/10 text-success' 
							: 'bg-warning/10 text-warning'
					}`}>
						{course.status === 'published' ? 'Published' : 'Draft'}
					</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-caption text-muted-foreground space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-medium">Author:</span>
						<span>{course.authorName || 'Unknown'}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-medium">Created:</span>
						<span>{course.createdAt?.toDate ? course.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
					</div>
					{course.status === 'published' && course.updatedAt && (
						<div className="flex items-center gap-2">
							<span className="font-medium">Published:</span>
							<span>{course.updatedAt?.toDate ? course.updatedAt.toDate().toLocaleDateString() : 'N/A'}</span>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
					{course.status === 'draft' && canEdit && (
						<Button
							onClick={handlePublish}
							disabled={loading}
							size="sm"
							className="flex-1 sm:flex-none"
						>
							Publish
						</Button>
					)}
					{course.status === 'published' && canEdit && (
						<Button
							onClick={handleUnpublish}
							disabled={loading}
							variant="outline"
							size="sm"
							className="border-warning text-warning hover:bg-warning/10 flex-1 sm:flex-none"
						>
							Unpublish
						</Button>
					)}
					{canEdit && (
						<a href={`/dashboard/courses/${course.id}/edit`}>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								Edit
							</Button>
						</a>
					)}
					{canDelete && (
						<Button
							onClick={handleDelete}
							disabled={loading}
							variant="destructive"
							size="sm"
							className="flex-1 sm:flex-none"
						>
							Delete
						</Button>
					)}
				</div>
				{error && (
					<div className="p-3 rounded-lg bg-error/10 border border-error/20">
						<p className="text-caption text-error">{error}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

