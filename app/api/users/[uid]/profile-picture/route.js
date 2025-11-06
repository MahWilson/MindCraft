import { NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { cookies } from 'next/headers';

// PUT - Update profile picture URL
export async function PUT(request, { params }) {
	try {
		const { uid } = params;
		const body = await request.json();
		const { profilePictureUrl } = body;

		if (!profilePictureUrl) {
			return NextResponse.json({ error: 'Profile picture URL is required' }, { status: 400 });
		}

		const cookieStore = await cookies();
		const currentUserRole = cookieStore.get('user_role')?.value;
		const currentUserId = cookieStore.get('user_id')?.value;

		// Check permissions: users can update their own profile picture, admins can update any
		if (!currentUserRole || (currentUserRole !== 'admin' && currentUserId !== uid)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		await updateDoc(doc(db, 'users', uid), {
			profilePicture: profilePictureUrl,
		});

		return NextResponse.json({ success: true, message: 'Profile picture updated successfully' });
	} catch (error) {
		console.error('Error updating profile picture:', error);
		return NextResponse.json({ error: 'Failed to update profile picture' }, { status: 500 });
	}
}

