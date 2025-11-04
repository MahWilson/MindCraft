// User update API route
// PUT /api/users/[id] - Update user account details

import { NextResponse } from 'next/server';
import { db } from '../../../../firebase.js';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function PUT(request, { params }) {
	try {
		const { id } = params;
		const body = await request.json();
		const { name, email, class: userClass, status } = body;

		// Basic validation
		if (!name && !email && !userClass && !status) {
			return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
		}

		// Check if user exists
		const userRef = doc(db, 'users', id);
		const userDoc = await getDoc(userRef);
		
		if (!userDoc.exists()) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Prepare update data
		const updateData = {
			updatedAt: serverTimestamp(),
		};

		if (name) updateData.name = name;
		if (email) updateData.email = email;
		if (userClass !== undefined) updateData.class = userClass;
		if (status) updateData.status = status;

		// Update user document
		await updateDoc(userRef, updateData);

		return NextResponse.json({ 
			message: 'User updated successfully',
			id 
		});

	} catch (error) {
		console.error('Error updating user:', error);
		return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
	}
}

export async function GET(request, { params }) {
	try {
		const { id } = params;
		const userRef = doc(db, 'users', id);
		const userDoc = await getDoc(userRef);
		
		if (!userDoc.exists()) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({
			id: userDoc.id,
			...userDoc.data()
		});

	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
	}
}
