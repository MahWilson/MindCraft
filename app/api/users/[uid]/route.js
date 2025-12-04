import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { cookies } from 'next/headers';

// GET - Get user details
export async function GET(request, { params }) {
	try {
		const { uid } = params;
		const cookieStore = await cookies();
		const currentUserRole = cookieStore.get('user_role')?.value;
		const currentUserId = cookieStore.get('user_id')?.value;

		// Check permissions: users can read their own profile, admins can read any
		if (!currentUserRole || (currentUserRole !== 'admin' && currentUserId !== uid)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const userDoc = await getDoc(doc(db, 'user', uid));
		if (!userDoc.exists()) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = { id: userDoc.id, ...userDoc.data() };
		return NextResponse.json({ user: userData });
	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
	}
}

// PUT - Update user details
export async function PUT(request, { params }) {
	try {
		const { uid } = params;
		const body = await request.json();
		const { name, email } = body;

		const cookieStore = await cookies();
		const currentUserRole = cookieStore.get('user_role')?.value;
		const currentUserId = cookieStore.get('user_id')?.value;

		// Check permissions: users can update their own profile, admins can update any
		if (!currentUserRole || (currentUserRole !== 'admin' && currentUserId !== uid)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Prevent admin from deleting themselves
		if (currentUserRole === 'admin' && currentUserId === uid && body.deleteAccount) {
			return NextResponse.json({ error: 'Admins cannot delete their own account' }, { status: 400 });
		}

		const updateData = {};
		if (name !== undefined) updateData.name = name.trim();
		if (email !== undefined) updateData.email = email.trim();

		await updateDoc(doc(db, 'user', uid), updateData);

		return NextResponse.json({ success: true, message: 'User updated successfully' });
	} catch (error) {
		console.error('Error updating user:', error);
		return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
	}
}

// DELETE - Delete user account
export async function DELETE(request, { params }) {
	try {
		const { uid } = params;
		const cookieStore = await cookies();
		const currentUserRole = cookieStore.get('user_role')?.value;
		const currentUserId = cookieStore.get('user_id')?.value;

		// Only admins can delete accounts, and they cannot delete themselves
		if (currentUserRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized: Only admins can delete accounts' }, { status: 403 });
		}

		if (currentUserId === uid) {
			return NextResponse.json({ error: 'Admins cannot delete their own account' }, { status: 400 });
		}

		// Delete user document from Firestore
		await deleteDoc(doc(db, 'user', uid));

		return NextResponse.json({ success: true, message: 'User account deleted successfully' });
	} catch (error) {
		console.error('Error deleting user:', error);
		return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
	}
}

