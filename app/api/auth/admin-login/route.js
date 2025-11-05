import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
	try {
		const { username, password } = await request.json();
		if (!username || !password) {
			return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
		}
		const filePath = path.join(process.cwd(), 'data', 'admin.json');
		const raw = await readFile(filePath, 'utf8');
		const creds = JSON.parse(raw);
		if (username !== creds.username || password !== creds.password) {
			return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
		}
		const res = NextResponse.json({ ok: true });
		// Demo cookie (HttpOnly); in production use signed JWT/session
		res.cookies.set('admin_session', '1', { httpOnly: true, path: '/', maxAge: 60 * 60 });
		return res;
	} catch (err) {
		return NextResponse.json({ error: 'Login failed', details: String(err) }, { status: 500 });
	}
}


