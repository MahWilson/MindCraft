'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
			const userDocRef = doc(db, 'user', user.uid);
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
		<div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center space-y-2">
					<CardTitle className="text-h2">Sign In</CardTitle>
					<CardDescription>Welcome back to MindCraft</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-6">
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">Email</label>
							<Input
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="w-full"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-caption font-medium text-neutralDark">Password</label>
							<Input
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full"
							/>
						</div>
						<Button
							className="w-full"
							type="submit"
							disabled={loading}
							size="lg"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</Button>
					</form>
					{error ? (
						<div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/20">
							<p className="text-error text-caption text-center">{error}</p>
						</div>
					) : null}
					<p className="text-caption text-muted-foreground mt-6 text-center">
						Sign in with your Firebase Auth credentials
					</p>
				</CardContent>
			</Card>
		</div>
	);
}


