import '../styles/globals.css';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignOutButton from './components/SignOutButton';

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
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/analytics', label: 'Analytics' },
		];
	} else if (role === 'teacher') {
		return [
			{ href: '/dashboard/teacher', label: 'Dashboard' },
			{ href: '/dashboard/courses/new', label: 'Create Course' },
			{ href: '/admin/courses', label: 'Manage Courses' },
			{ href: '/assessments', label: 'Assessments' },
			{ href: '/assignments', label: 'Grade Assignments' },
			{ href: '/analytics', label: 'Analytics' },
		];
	} else if (role === 'student') {
		return [
			{ href: '/dashboard/student', label: 'Dashboard' },
			{ href: '/courses', label: 'My Courses' },
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
			<body className="min-h-screen">
				<div className="flex min-h-screen">
					<aside className="hidden md:flex w-64 flex-col bg-white border-r">
						<Link href="/" className="p-4 text-xl font-bold">
							MindCraft
						</Link>
						<div className="px-4 py-2 text-xs text-gray-500 capitalize">{role === 'guest' ? 'Guest' : role}</div>
						<nav className="px-2 space-y-1 flex-1">
							{navItems.map((item) => (
								<Link key={item.href} className="block px-3 py-2 rounded hover:bg-gray-100" href={item.href}>
									{item.label}
								</Link>
							))}
						</nav>
					</aside>
					<main className="flex-1">
						<header className="sticky top-0 z-10 bg-white border-b">
							<div className="flex items-center justify-between h-14 px-4">
								<div className="md:hidden font-bold">MindCraft</div>
								<div className="flex items-center gap-4 ml-auto">
									{role === 'guest' ? (
										<Link href="/login" className="text-sm text-blue-600 hover:underline">
											Sign In
										</Link>
									) : (
										<>
											<span className="text-sm text-gray-600 capitalize">{role}</span>
											<SignOutButton />
										</>
									)}
								</div>
							</div>
						</header>
						<div className="p-4">{children}</div>
					</main>
				</div>
			</body>
		</html>
	);
}
