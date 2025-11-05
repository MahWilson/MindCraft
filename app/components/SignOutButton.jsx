'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
	const router = useRouter();

	async function handleSignOut() {
		try {
			// Sign out from Firebase Auth
			await signOut(auth);
			
			// Clear cookies via API
			await fetch('/api/auth/logout', { method: 'POST' });
			
			// Redirect to home
			router.push('/');
		} catch (err) {
			console.error('Sign out error:', err);
			// Still redirect even if there's an error
			router.push('/');
		}
	}

	return (
		<button
			onClick={handleSignOut}
			className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
		>
			Sign Out
		</button>
	);
}

