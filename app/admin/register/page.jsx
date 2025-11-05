'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

export default function AdminRegisterPage() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState('teacher');
	const [ok, setOk] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setOk('');
		setError('');
		setLoading(true);

		if (!name || !email || !password) {
			setError('All fields are required');
			setLoading(false);
			return;
		}

		try {
			// Step 1: Create user in Firebase Auth (this handles password)
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user; // This gives us the uid

			// Step 2: Create user profile in Firestore
			await setDoc(doc(db, 'users', user.uid), {
				name: name.trim(),
				email: email.trim(),
				role: role,
				status: 'active',
				createdAt: serverTimestamp(),
			});

			setOk(`User "${name}" registered successfully! They can now sign in with email: ${email}`);
			setName('');
			setEmail('');
			setPassword('');
			setRole('teacher');
		} catch (err) {
			if (err.code === 'auth/email-already-in-use') {
				setError('This email is already registered');
			} else if (err.code === 'auth/invalid-email') {
				setError('Invalid email format');
			} else if (err.code === 'auth/weak-password') {
				setError('Password should be at least 6 characters');
			} else {
				setError(err.message || 'Failed to register user');
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-sm mx-auto bg-white border rounded p-4">
			<h1 className="text-lg font-semibold mb-3">Register Teacher/Student</h1>
			<form onSubmit={onSubmit} className="space-y-3">
				<input
					required
					className="w-full border rounded p-2"
					placeholder="Full name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<input
					required
					type="email"
					className="w-full border rounded p-2"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<input
					required
					type="password"
					className="w-full border rounded p-2"
					placeholder="Password (min 6 characters)"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					minLength={6}
				/>
				<select className="w-full border rounded p-2" value={role} onChange={(e) => setRole(e.target.value)}>
					<option value="teacher">Teacher</option>
					<option value="student">Student</option>
				</select>
				<button
					className="w-full bg-blue-600 text-white rounded py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
					type="submit"
					disabled={loading}
				>
					{loading ? 'Creating...' : 'Create account'}
				</button>
			</form>
			{error ? <p className="text-red-600 mt-2 text-sm">{error}</p> : null}
			{ok ? <p className="text-green-600 mt-2 text-sm">{ok}</p> : null}
			<p className="text-xs text-gray-500 mt-3">
				Admin must be signed in to use this page. The user will be created in Firebase Auth and Firestore.
			</p>
		</div>
	);
}


