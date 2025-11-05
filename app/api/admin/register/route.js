import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

function requireAdminCookie(request) {
	const cookie = request.headers.get('cookie') || '';
	return cookie.includes('user_role=admin');
}

export async function POST(request) {
	try {
		if (!requireAdminCookie(request)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		const { name, email, role } = await request.json();
		if (!name || !email || !['teacher', 'student'].includes(role)) {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}
		const dir = path.join(process.cwd(), 'data');
		await mkdir(dir, { recursive: true });
		const filePath = path.join(dir, 'users.json');
		let list = [];
		try {
			const raw = await readFile(filePath, 'utf8');
			list = JSON.parse(raw);
		} catch {}
		const item = { id: crypto.randomUUID(), name, email, role, createdAt: new Date().toISOString() };
		list.push(item);
		await writeFile(filePath, JSON.stringify(list, null, 2));
		return NextResponse.json({ ok: true, user: item });
	} catch (err) {
		return NextResponse.json({ error: 'Register failed', details: String(err) }, { status: 500 });
	}
}

export async function GET(request) {
	try {
		if (!requireAdminCookie(request)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		const filePath = path.join(process.cwd(), 'data', 'users.json');
		const raw = await readFile(filePath, 'utf8').catch(() => '[]');
		const list = JSON.parse(raw);
		return NextResponse.json({ items: list });
	} catch (err) {
		return NextResponse.json({ error: 'Failed to list users', details: String(err) }, { status: 500 });
	}
}


