import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

function getUserId(request) {
	const cookie = request.headers.get('cookie') || '';
	const match = cookie.match(/user_id=([^;]+)/);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

function getRole(request) {
	const cookie = request.headers.get('cookie') || '';
	return cookie.match(/user_role=([^;]+)/)?.[1];
}

async function getUserInfo(userId) {
	try {
		const filePath = path.join(process.cwd(), 'data', 'users.json');
		const raw = await readFile(filePath, 'utf8');
		const users = JSON.parse(raw);
		const user = users.find((u) => u.id === userId);
		return user ? { name: user.name, email: user.email } : { name: 'Unknown', email: '' };
	} catch {
		return { name: 'Unknown', email: '' };
	}
}

export async function PUT(request, { params }) {
	try {
		const { id } = params;
		const userId = getUserId(request);
		const role = getRole(request);

		if (role !== 'admin' && role !== 'teacher') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const filePath = path.join(process.cwd(), 'data', 'courses.json');
		const raw = await readFile(filePath, 'utf8');
		const courses = JSON.parse(raw);

		const courseIndex = courses.findIndex((c) => c.id === id);
		if (courseIndex === -1) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		const course = courses[courseIndex];

		// Teachers can only edit their own courses
		// Handle null createdBy (legacy courses or admin-created)
		if (role === 'teacher') {
			if (!course.createdBy) {
				return NextResponse.json({ error: 'Forbidden: This course was created by an admin' }, { status: 403 });
			}
			// Compare trimmed strings to handle any whitespace issues
			const courseCreatedBy = String(course.createdBy).trim();
			const currentUserId = userId ? String(userId).trim() : null;
			if (courseCreatedBy !== currentUserId) {
				return NextResponse.json({ 
					error: 'Forbidden: You can only edit your own courses',
					debug: { courseCreatedBy, currentUserId, match: courseCreatedBy === currentUserId }
				}, { status: 403 });
			}
		}

		const body = await request.json();
		const { title, description, modules, status } = body;

		// Update course fields
		if (title !== undefined) courses[courseIndex].title = title.trim();
		if (description !== undefined) courses[courseIndex].description = description?.trim?.() || '';
		if (modules !== undefined) courses[courseIndex].modules = modules;
		if (status !== undefined && (status === 'draft' || status === 'published')) {
			courses[courseIndex].status = status;
		}

		// Update author info if changed
		if (userId && course.createdBy === userId) {
			const authorInfo = await getUserInfo(userId);
			courses[courseIndex].authorName = authorInfo.name;
			courses[courseIndex].authorEmail = authorInfo.email;
		}

		courses[courseIndex].updatedAt = new Date().toISOString();

		await writeFile(filePath, JSON.stringify(courses, null, 2));

		return NextResponse.json(courses[courseIndex]);
	} catch (err) {
		return NextResponse.json({ error: 'Failed to update course', details: String(err) }, { status: 500 });
	}
}

export async function DELETE(request, { params }) {
	try {
		const { id } = params;
		const userId = getUserId(request);
		const role = getRole(request);

		if (role !== 'admin' && role !== 'teacher') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const filePath = path.join(process.cwd(), 'data', 'courses.json');
		const raw = await readFile(filePath, 'utf8');
		const courses = JSON.parse(raw);

		const courseIndex = courses.findIndex((c) => c.id === id);
		if (courseIndex === -1) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		const course = courses[courseIndex];

		// Teachers can delete their own courses (drafts or published)
		// Admins can delete any course
		if (role === 'teacher') {
			const courseCreatedBy = course.createdBy ? String(course.createdBy).trim() : null;
			const currentUserId = userId ? String(userId).trim() : null;
			if (!courseCreatedBy || courseCreatedBy !== currentUserId) {
				return NextResponse.json({ error: 'Forbidden: You can only delete your own courses' }, { status: 403 });
			}
		}

		courses.splice(courseIndex, 1);
		await writeFile(filePath, JSON.stringify(courses, null, 2));

		return NextResponse.json({ ok: true });
	} catch (err) {
		return NextResponse.json({ error: 'Failed to delete course', details: String(err) }, { status: 500 });
	}
}

