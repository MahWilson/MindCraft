import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { cookies } from 'next/headers';

// GET - List all users (admin only)
export async function GET() {
	try {
		const cookieStore = await cookies();
		const currentUserRole = cookieStore.get('user_role')?.value;

		// Only admins can list all users
		if (currentUserRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized: Only admins can view all users' }, { status: 403 });
		}

		const usersSnapshot = await getDocs(query(collection(db, 'user'), orderBy('createdAt', 'desc')));
		const users = usersSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
		}));

		return NextResponse.json({ users });
	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}

