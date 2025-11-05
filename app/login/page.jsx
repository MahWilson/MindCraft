'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			// Step 1: Sign in with Firebase Auth
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user; // This has the uid

			// Step 2: Get user role from Firestore users collection
			const userDocRef = doc(db, 'users', user.uid);
			const userDoc = await getDoc(userDocRef);

			let role;
			if (userDoc.exists()) {
				// User profile exists in Firestore
				role = userDoc.data().role;
			} else {
				// First time login - check if it's admin (from admin.json)
				// For now, we'll create a default user profile
				// TODO: Handle admin login separately or create admin user in Firestore
				role = 'student'; // Default fallback
			}

			// Step 3: Set session cookies (for server-side role checks)
			await fetch('/api/auth/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uid: user.uid,
					email: user.email,
					role: role,
				}),
			});

			// Step 4: Redirect based on role
			if (role === 'admin') {
				router.push('/dashboard/admin');
			} else if (role === 'teacher') {
				router.push('/dashboard/teacher');
			} else if (role === 'student') {
				router.push('/dashboard/student');
			} else {
				router.push('/dashboard');
			}
		} catch (err) {
			// Firebase Auth errors
			if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
				setError('Invalid email or password');
			} else if (err.code === 'auth/invalid-email') {
				setError('Invalid email format');
			} else {
				setError(err.message || 'Login failed');
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="max-w-sm w-full mx-auto bg-white border rounded-lg p-6 shadow-lg">
				<h1 className="text-2xl font-bold mb-2 text-center">Sign In</h1>
				<p className="text-sm text-gray-600 mb-4 text-center">Admin, Teacher, or Student</p>
				<form onSubmit={onSubmit} className="space-y-4">
					<input
						className="w-full border rounded p-2"
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<input
						className="w-full border rounded p-2"
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
					<button
						className="w-full bg-blue-600 text-white rounded py-2 font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
						type="submit"
						disabled={loading}
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>
				{error ? <p className="text-red-600 mt-3 text-sm text-center">{error}</p> : null}
				<p className="text-xs text-gray-500 mt-4 text-center">
					Sign in with your Firebase Auth email and password
				</p>
			</div>
		</div>
	);
}


