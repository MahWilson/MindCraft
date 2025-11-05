import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
	try {
		const { email, password } = await request.json();
		if (!email || !password) {
			return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
		}

		// Check admin first (admin can use username or email field)
		const adminPath = path.join(process.cwd(), 'data', 'admin.json');
		try {
			const adminRaw = await readFile(adminPath, 'utf8');
			const admin = JSON.parse(adminRaw);
			// Admin login: email field can be username OR email
			if ((email === admin.username || email === admin.email) && password === admin.password) {
				const res = NextResponse.json({ ok: true, role: 'admin' });
				res.cookies.set('user_role', 'admin', { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
				res.cookies.set('user_email', email, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
				return res;
			}
		} catch {}

		// Check users.json (teachers/students)
		const usersPath = path.join(process.cwd(), 'data', 'users.json');
		try {
			const usersRaw = await readFile(usersPath, 'utf8');
			const users = JSON.parse(usersRaw);
			const user = users.find((u) => u.email === email);
			if (user) {
				// For demo: accept any password. In production, hash passwords.
				const res = NextResponse.json({ ok: true, role: user.role, user });
				res.cookies.set('user_role', user.role, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
				res.cookies.set('user_email', email, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
				res.cookies.set('user_id', user.id, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
				return res;
			}
		} catch {}

		return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
	} catch (err) {
		return NextResponse.json({ error: 'Login failed', details: String(err) }, { status: 500 });
	}
}

