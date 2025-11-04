'use client';

import { useState } from 'react';

export default function NewCoursePage() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [publish, setPublish] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [successId, setSuccessId] = useState('');

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccessId('');
		try {
			const res = await fetch('/api/courses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					status: publish ? 'published' : 'draft',
					modules: [], // TODO: add module creation flow
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || 'Failed to save');
			}
			const data = await res.json();
			setSuccessId(data.id);
			// TODO(navigation): redirect to `/dashboard/courses/${data.id}`
		} catch (err) {
			setError(String(err.message || err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div style={{ maxWidth: 640, margin: '24px auto', padding: 16 }}>
			<h1 style={{ fontSize: 24, marginBottom: 16 }}>Create Course</h1>
			<form onSubmit={onSubmit}>
				<label style={{ display: 'block', marginBottom: 8 }}>
					<span>Title</span>
					<input
						required
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
					/>
				</label>

				<label style={{ display: 'block', marginBottom: 8 }}>
					<span>Description</span>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
						style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
					/>
				</label>

				<label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
					<input
						type="checkbox"
						checked={publish}
						onChange={(e) => setPublish(e.target.checked)}
					/>
					<span>Publish immediately</span>
				</label>

				<button type="submit" disabled={submitting} style={{ padding: '8px 12px' }}>
					{submitting ? 'Saving…' : 'Save Course'}
				</button>
			</form>

			{error ? (
				<p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>
			) : null}
			{successId ? (
				<p style={{ color: 'green', marginTop: 12 }}>Saved! ID: {successId}</p>
			) : null}

			{/* TODO(RBAC): Hide this page for non-teachers. */}
		</div>
	);
}


