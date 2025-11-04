// User management API routes
// POST /api/users - Create new user account
// GET /api/users - List all users (admin only)

import { NextResponse } from 'next/server';
import { db } from '../../../firebase.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export async function POST(request) {
	try {
		const body = await request.json();
		const { fullName, email, username, role } = body;

		// Basic validation
		if (!fullName || !email || !username || !role) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (!['student', 'teacher'].includes(role)) {
			return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
		}

		// Check for duplicate email
		const emailQuery = query(collection(db, 'users'), where('email', '==', email));
		const emailSnapshot = await getDocs(emailQuery);
		if (!emailSnapshot.empty) {
			return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
		}

		// Check for duplicate username
		const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
		const usernameSnapshot = await getDocs(usernameQuery);
		if (!usernameSnapshot.empty) {
			return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
		}

		// Create user document
		const userData = {
			name: fullName,
			email,
			username,
			role,
			profilePic: '',
			class: '',
			status: 'active',
			createdAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, 'users'), userData);

		return NextResponse.json({ 
			id: docRef.id, 
			message: 'User created successfully' 
		});

	} catch (error) {
		console.error('Error creating user:', error);
		return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
	}
}

export async function GET(request) {
	try {
		const usersSnapshot = await getDocs(collection(db, 'users'));
		const users = [];
		
		usersSnapshot.forEach((doc) => {
			users.push({
				id: doc.id,
				...doc.data()
			});
		});

		return NextResponse.json({ users });

	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}
