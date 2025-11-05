// Next.js App Router API: /api/courses
// Note: For Firestore, we read directly from client-side in pages
// This endpoint is kept for compatibility but can be removed later

import { NextResponse } from 'next/server';

export async function GET(request) {
	// For now, return empty array - pages will read from Firestore directly
	// TODO: If you need server-side reading, use Firebase Admin SDK
	return NextResponse.json({ items: [] });
}

// POST is now handled client-side in app/dashboard/courses/new/page.jsx
