import { NextResponse } from 'next/server';

export async function POST() {
	// Clear cookies
	const res = NextResponse.json({ success: true });
	res.cookies.set('user_role', '', { maxAge: 0, path: '/' });
	res.cookies.set('user_email', '', { maxAge: 0, path: '/' });
	res.cookies.set('user_id', '', { maxAge: 0, path: '/' });
	res.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
	return res;
}
