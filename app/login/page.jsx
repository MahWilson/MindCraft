'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
			const userDocRef = doc(db, 'users', user.uid);
			const userDoc = await getDoc(userDocRef);

      let role;
      const ADMIN_EMAILS = ['admin@mindcraft.local', 'testadmin@gmail.com'];
      const TEACHER_EMAILS = ['teacher1@gmail.com', 'teach1@gmail.com'];
      if (userDoc.exists()) {
        role = userDoc.data().role;
        const desired = ADMIN_EMAILS.includes(user.email)
          ? 'admin'
          : TEACHER_EMAILS.includes(user.email)
          ? 'teacher'
          : role;
        role = desired; // do not write to Firestore; use desired for routing/session only
      } else {
        if (ADMIN_EMAILS.includes(user.email)) role = 'admin';
        else if (TEACHER_EMAILS.includes(user.email)) role = 'teacher';
        else role = 'student';
        // do not create Firestore profile here to avoid any write permission conflicts
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
			console.error('Login error:', err.code, err.message);
			
			if (err.code === 'auth/user-not-found') {
				setError('No account found with this email. Please register first or contact an admin.');
			} else if (err.code === 'auth/wrong-password') {
				setError('Incorrect password. Please try again.');
			} else if (err.code === 'auth/invalid-credential') {
				setError('Invalid email or password. Please check your credentials and try again.');
			} else if (err.code === 'auth/invalid-email') {
				setError('Invalid email format. Please enter a valid email address.');
			} else if (err.code === 'auth/too-many-requests') {
				setError('Too many failed login attempts. Please try again later.');
			} else {
				setError(err.message || 'Login failed. Please try again.');
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


