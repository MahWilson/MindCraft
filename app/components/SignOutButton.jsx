'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
	const router = useRouter();

	async function handleSignOut() {
		try {
			// Sign out from Firebase Auth
			await signOut(auth);
			
			// Clear cookies via API
			await fetch('/api/auth/logout', { method: 'POST' });
			
			// Force full page reload to ensure server sees cleared cookies
			window.location.href = '/';
		} catch (err) {
			console.error('Sign out error:', err);
			// Still redirect even if there's an error
			window.location.href = '/';
		}
	}

	return (
		<Button
			onClick={handleSignOut}
			variant="destructive"
			size="sm"
		>
			Sign Out
		</Button>
	);
}

