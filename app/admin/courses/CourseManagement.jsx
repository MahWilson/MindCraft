'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function CourseManagement({ course, currentUserId, currentRole }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [unpublishConfirm, setUnpublishConfirm] = useState(null);
	const router = useRouter();
	const { language } = useLanguage();

	// Translations
	const translations = {
		en: {
			noDescription: 'No description provided',
			published: 'Published',
			draft: 'Draft',
			author: 'Author:',
			created: 'Created:',
			unknown: 'Unknown',
			publishedDate: 'Published:',
			publish: 'Publish',
			unpublish: 'Unpublish',
			edit: 'Edit',
			delete: 'Delete',
			confirmDelete: 'Confirm Delete',
			deleteMessage: 'Are you sure you want to delete this course? This action cannot be undone.',
			course: 'Course:',
			cancel: 'Cancel',
			deleteButton: 'Delete',
			confirmUnpublish: 'Confirm Unpublish',
			unpublishMessage: 'Unpublish this course? It will be moved back to draft and taken off the live server.',
			unpublishButton: 'Unpublish',
			deleteFailed: 'Failed to delete course',
			publishFailed: 'Failed to publish course',
			unpublishFailed: 'Failed to unpublish course',
		},
		bm: {
			noDescription: 'Tiada penerangan disediakan',
			published: 'Diterbitkan',
			draft: 'Draf',
			author: 'Pengarang:',
			created: 'Dicipta:',
			unknown: 'Tidak diketahui',
			publishedDate: 'Diterbitkan:',
			publish: 'Terbitkan',
			unpublish: 'Nyahterbitkan',
			edit: 'Edit',
			delete: 'Padam',
			confirmDelete: 'Sahkan Padam',
			deleteMessage: 'Adakah anda pasti mahu memadam kursus ini? Tindakan ini tidak boleh dibatalkan.',
			course: 'Kursus:',
			cancel: 'Batal',
			deleteButton: 'Padam',
			confirmUnpublish: 'Sahkan Nyahterbitkan',
			unpublishMessage: 'Nyahterbitkan kursus ini? Ia akan dipindahkan kembali ke draf dan dikeluarkan dari pelayan langsung.',
			unpublishButton: 'Nyahterbitkan',
			deleteFailed: 'Gagal memadam kursus',
			publishFailed: 'Gagal menerbitkan kursus',
			unpublishFailed: 'Gagal nyahterbitkan kursus',
		},
	};

	const t = translations[language] || translations.en;

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	// Teachers can delete their own courses (drafts or published), admins can delete any course
	const canDelete =
		currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);

	function confirmDelete() {
		setDeleteConfirm({
			courseId: course.id,
			title: course.title,
		});
	}

	async function handleDelete() {
		if (!deleteConfirm) return;
		
		setLoading(true);
		setError('');
		try {
			await deleteDoc(doc(db, 'course', course.id));
			// Force page reload to refresh the courses list
			window.location.reload();
		} catch (err) {
			console.error('Delete error:', err);
			setError(err.message || t.deleteFailed);
			setLoading(false);
			setDeleteConfirm(null);
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
			setError(err.message || t.publishFailed);
			setLoading(false);
		}
	}

	function confirmUnpublish() {
		setUnpublishConfirm({
			courseId: course.id,
			title: course.title,
		});
	}

	async function handleUnpublish() {
		if (!unpublishConfirm) return;
		
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
			setError(err.message || t.unpublishFailed);
			setLoading(false);
			setUnpublishConfirm(null);
		}
	}

	return (
		<>
		<Card className="card-hover">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-h3 mb-2 line-clamp-2">{course.title}</CardTitle>
						<CardDescription className="line-clamp-2 mb-4">
							{course.description || t.noDescription}
						</CardDescription>
					</div>
					<span className={`px-3 py-1 rounded-full text-caption font-medium whitespace-nowrap ${
						course.status === 'published' 
							? 'bg-success/10 text-success' 
							: 'bg-warning/10 text-warning'
					}`}>
						{course.status === 'published' ? t.published : t.draft}
					</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-caption text-muted-foreground space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-medium">{t.author}</span>
						<span>{course.authorName || t.unknown}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{t.created}</span>
						<span>{course.createdAt?.toDate ? course.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
					</div>
					{course.status === 'published' && course.updatedAt && (
						<div className="flex items-center gap-2">
							<span className="font-medium">{t.publishedDate}</span>
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
							{t.publish}
						</Button>
					)}
					{course.status === 'published' && canEdit && (
						<Button
							onClick={confirmUnpublish}
							disabled={loading}
							variant="outline"
							size="sm"
							className="border-warning text-warning hover:bg-warning/10 flex-1 sm:flex-none"
						>
							{t.unpublish}
						</Button>
					)}
					{canEdit && (
						<a href={`/dashboard/courses/${course.id}/edit`}>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								{t.edit}
							</Button>
						</a>
					)}
					{canDelete && (
						<Button
							onClick={confirmDelete}
							disabled={loading}
							variant="destructive"
							size="sm"
							className="flex-1 sm:flex-none"
						>
							{t.delete}
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

		{/* Delete Confirmation Modal */}
		{deleteConfirm && (
			<div 
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setDeleteConfirm(null);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						setDeleteConfirm(null);
					}
				}}
				tabIndex={-1}
			>
				<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
					<CardHeader>
						<CardTitle className="text-h3 text-destructive flex items-center gap-2">
							<AlertCircle className="h-6 w-6" />
							{t.confirmDelete}
						</CardTitle>
						<CardDescription>
							{t.deleteMessage}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm font-medium text-destructive">
								{t.course} {deleteConfirm.title}
							</p>
						</div>
						<div className="flex gap-3 justify-end">
							<Button
								variant="outline"
								onClick={() => setDeleteConfirm(null)}
								disabled={loading}
							>
								{t.cancel}
							</Button>
							<Button
								variant="destructive"
								onClick={handleDelete}
								disabled={loading}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								{t.deleteButton}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		)}

		{/* Unpublish Confirmation Modal */}
		{unpublishConfirm && (
			<div 
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setUnpublishConfirm(null);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						setUnpublishConfirm(null);
					}
				}}
				tabIndex={-1}
			>
				<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
					<CardHeader>
						<CardTitle className="text-h3 text-warning flex items-center gap-2">
							<AlertCircle className="h-6 w-6" />
							{t.confirmUnpublish}
						</CardTitle>
						<CardDescription>
							{t.unpublishMessage}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
							<p className="text-sm font-medium text-warning">
								{t.course} {unpublishConfirm.title}
							</p>
						</div>
						<div className="flex gap-3 justify-end">
							<Button
								variant="outline"
								onClick={() => setUnpublishConfirm(null)}
								disabled={loading}
							>
								{t.cancel}
							</Button>
							<Button
								variant="outline"
								onClick={handleUnpublish}
								disabled={loading}
								className="border-warning text-warning hover:bg-warning/10"
							>
								{t.unpublishButton}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		)}
		</>
	);
}

