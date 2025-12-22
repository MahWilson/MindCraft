'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { 
	LayoutDashboard, 
	UserPlus, 
	BookOpen, 
	BarChart3, 
	FileText, 
	ClipboardCheck, 
	GraduationCap, 
	MessageSquare,
	Home,
	Search,
	User,
	Users,
	Settings,
	Code,
	Lightbulb,
	Brain
} from 'lucide-react';

const iconMap = {
	'Dashboard': LayoutDashboard,
	'Register Users': UserPlus,
	'Manage Users': Users,
	'Manage Courses': BookOpen,
	'Settings': Settings,
	'Analytics': BarChart3,
	'Create Course': FileText,
	'Assessments': ClipboardCheck,
	'Assignments': FileText,
	'My Courses': BookOpen,
	'Progress': BarChart3,
	'Forum': MessageSquare,
	'Home': Home,
	'Explore Courses': Search,
	'Profile': User,
	'Sign In': null,
	'Coding Help': Code,
	'Explain Concept': Lightbulb,
	'Recommendations': Brain,
};

export default function Sidebar({ role: initialRole, navItems: initialNavItems }) {
	const pathname = usePathname();
	const router = useRouter();
	const [profilePicture, setProfilePicture] = useState(null);
	const [userName, setUserName] = useState('');
	const [currentRole, setCurrentRole] = useState(initialRole);
	const [navItems, setNavItems] = useState(initialNavItems);

	// Listen to auth state changes and refresh the page
	useEffect(() => {
		let unsubscribeAuth;
		let unsubscribeFirestore;

		unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
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
								// Refresh server component to get updated nav items
								router.refresh();
								return newRole;
							}
							return prevRole;
						});
						
						setProfilePicture(userData.profilePicture || null);
						setUserName(userData.name || '');
					}
					
					// Set up real-time listener for user profile changes
					unsubscribeFirestore = onSnapshot(
						userDocRef,
						(snapshot) => {
							if (snapshot.exists()) {
								const userData = snapshot.data();
								const newRole = userData.role || 'student';
								
								// Update role if it changed
								setCurrentRole(prevRole => {
									if (newRole !== prevRole) {
										router.refresh();
										return newRole;
									}
									return prevRole;
								});
								
								setProfilePicture(userData.profilePicture || null);
								setUserName(userData.name || '');
							}
						},
						(error) => {
							console.error('Error listening to user profile:', error);
						}
					);
				} catch (error) {
					console.error('Error fetching user data:', error);
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
				setProfilePicture(null);
				setUserName('');
				if (unsubscribeFirestore) {
					unsubscribeFirestore();
				}
			}
		});

		return () => {
			if (unsubscribeAuth) unsubscribeAuth();
			if (unsubscribeFirestore) unsubscribeFirestore();
		};
	}, [router]);

	// Update nav items when role prop changes (from server refresh)
	useEffect(() => {
		setCurrentRole(initialRole);
		setNavItems(initialNavItems);
	}, [initialRole, initialNavItems]);

	return (
		<aside className="hidden md:flex w-52 flex-shrink-0 h-screen flex-col bg-white border-r border-border shadow-sm sticky top-0 z-50">
			{/* Logo/Brand */}
			<Link 
				href="/" 
				className="px-6 pt-6 pb-4 flex items-center justify-center hover:opacity-80 transition-opacity duration-200"
			>
				<div className="flex-shrink-0 rounded-full overflow-hidden border border-border/50 shadow-sm w-28 h-28">
					<img
						src="/logoMindCraft.jpg"
						alt="MindCraft Logo"
						className="w-full h-full object-cover scale-100 -translate-y-1"
						onError={(e) => {
							// Hide image if logo file doesn't exist
							e.target.style.display = 'none';
						}}
					/>
				</div>
			</Link>
			
			{/* Profile Picture and Role Badge */}
			<div className="px-6 pb-6 flex items-center gap-3">
				{/* Profile Picture - Circular Container */}
				{profilePicture ? (
					<img
						src={profilePicture}
						alt={userName || 'Profile'}
						className="w-10 h-10 rounded-full object-cover border-2 border-border flex-shrink-0"
					/>
				) : (
					<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border flex-shrink-0">
						<User className="h-5 w-5 text-primary" />
					</div>
				)}
				
				{/* Role Badge */}
				<span className="inline-flex items-center px-3 py-1 rounded-lg text-caption font-medium bg-neutralLight text-neutralDark capitalize">
					{currentRole === 'guest' ? 'Guest' : currentRole}
				</span>
			</div>
			
			{/* Navigation */}
			<nav className="flex-1 px-3 space-y-1 overflow-y-auto">
				{navItems.map((item) => {
					const Icon = iconMap[item.label] || LayoutDashboard;
					const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
					
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-0',
								isActive
									? 'bg-primary text-white shadow-sm'
									: 'text-neutralDark hover:bg-neutralLight'
							)}
						>
							{Icon && <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-muted-foreground')} />}
							<span className="flex-1 min-w-0 overflow-visible whitespace-normal">{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

