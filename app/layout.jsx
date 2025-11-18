import '../styles/globals.css';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata = {
	title: 'MindCraft',
	description: 'AI-assisted learning platform',
};

async function getRole() {
	const cookieStore = await cookies();
	return cookieStore.get('user_role')?.value || 'guest';
}

function getNavItems(role) {
	if (role === 'admin') {
		return [
			{ href: '/dashboard/admin', label: 'Dashboard' },
			{ href: '/admin/register', label: 'Register Users' },
			{ href: '/admin/users', label: 'Manage Users' },
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/dashboard/modules', label: 'Module Library' },
			{ href: '/dashboard/assessments', label: 'Assessments' },
			{ href: '/profile', label: 'Profile' },
			{ href: '/analytics', label: 'Analytics' },
		];
	} else if (role === 'teacher') {
		return [
			{ href: '/dashboard/teacher', label: 'Dashboard' },
			{ href: '/dashboard/courses/new', label: 'Create Course' },
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/dashboard/modules', label: 'Module Library' },
			{ href: '/profile', label: 'Profile' },
			{ href: '/dashboard/assessments', label: 'Assessments' },
			{ href: '/assignments', label: 'Grade Assignments' },
			{ href: '/analytics', label: 'Analytics' },
		];
	} else if (role === 'student') {
		return [
			{ href: '/dashboard/student', label: 'Dashboard' },
			{ href: '/courses', label: 'My Courses' },
			{ href: '/courses/explore', label: 'Explore Courses' },
			{ href: '/profile', label: 'Profile' },
			{ href: '/assessments', label: 'Assessments' },
			{ href: '/progress', label: 'Progress' },
			{ href: '/forum', label: 'Forum' },
		];
	}
	// Guest nav
	return [
		{ href: '/', label: 'Home' },
		{ href: '/explore', label: 'Explore Courses' },
		{ href: '/login', label: 'Sign In' },
	];
}

export default async function RootLayout({ children }) {
	const role = await getRole();
	const navItems = getNavItems(role);

	return (
		<html lang="en">
			<body className="min-h-screen bg-neutralLight">
				<div className="flex min-h-screen">
					{/* Sidebar - in normal flow, takes up space */}
					<Sidebar role={role} navItems={navItems} />
					
					{/* Main content area */}
					<div className="flex-1 flex flex-col min-w-0">
						{/* Header - spans rest of width */}
						<Header role={role} />
						
						{/* Main content */}
						<main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">{children}</main>
					</div>
				</div>
			</body>
		</html>
	);
}
