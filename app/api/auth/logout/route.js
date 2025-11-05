import { NextResponse } from 'next/server';

export async function POST() {
	// Clear cookies and redirect to landing
	// Note: Firebase Auth sign out should be handled client-side
	const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
	res.cookies.set('user_role', '', { maxAge: 0, path: '/' });
	res.cookies.set('user_email', '', { maxAge: 0, path: '/' });
	res.cookies.set('user_id', '', { maxAge: 0, path: '/' });
	res.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
	return res;
}
