'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/app/components/SignOutButton';
import { Button } from './ui/button';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Header({ role: initialRole }) {
	const router = useRouter();
	const { language, setLanguage } = useLanguage();
	const [currentRole, setCurrentRole] = useState(initialRole);

	// Listen to auth state changes and refresh the page
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Get user role from Firestore
				try {
					const userDocRef = doc(db, 'user', user.uid);
					const userDoc = await getDoc(userDocRef);
					
					if (userDoc.exists()) {
						const userData = userDoc.data();
						const newRole = userData.role || 'student';
						
						// Update role if it changed (using functional update to avoid dependency)
						setCurrentRole(prevRole => {
							if (newRole !== prevRole) {
								// Refresh server component to get updated role
								router.refresh();
								return newRole;
							}
							return prevRole;
						});
					}
				} catch (error) {
					console.error('Error fetching user role:', error);
				}
			} else {
				// User signed out
				setCurrentRole(prevRole => {
					if (prevRole !== 'guest') {
						router.refresh();
						return 'guest';
					}
					return prevRole;
				});
			}
		});

		return () => unsubscribe();
	}, [router]);

	// Update role when prop changes (from server refresh)
	useEffect(() => {
		setCurrentRole(initialRole);
	}, [initialRole]);

	const toggleLanguage = () => {
		setLanguage(language === 'en' ? 'bm' : 'en');
	};

	return (
		<header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm relative w-full">
			{/* Single Unified Container - spans full width, 3x height */}
			<div className="flex items-center h-48 w-full">
				{/* Unified content area - single container */}
				<div className="flex-1 flex items-center justify-end px-6 min-w-0">
					{/* Mobile Logo - only visible on mobile */}
					<div className="md:hidden font-semibold text-h3 text-neutralDark mr-auto">MindCraft</div>
					
					{/* User Actions - always on the right */}
					<div className="flex items-center gap-3 flex-shrink-0">
						{currentRole !== 'guest' && (
							<Button
								variant="ghost"
								size="sm"
								onClick={toggleLanguage}
								className="flex items-center gap-2"
								title={language === 'en' ? 'Switch to Bahasa Melayu' : 'Tukar ke English'}
							>
								<Languages className="h-4 w-4" />
								<span className="hidden sm:inline text-caption font-medium">
									{language === 'en' ? 'EN' : 'BM'}
								</span>
							</Button>
						)}
						{currentRole === 'guest' ? (
							<Link href="/login">
								<Button variant="default" size="sm">
									Sign In
								</Button>
							</Link>
						) : (
							<>
								<span className="hidden sm:inline-flex items-center px-3 py-1 rounded-lg text-caption font-medium bg-neutralLight text-neutralDark capitalize whitespace-nowrap">
									{currentRole}
								</span>
								<SignOutButton />
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

