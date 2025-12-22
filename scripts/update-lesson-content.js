/**
 * Script to update existing lessons with content from sample data
 * 
 * Usage: node scripts/update-lesson-content.js your-email@example.com your-password
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase config from environment variables
function getFirebaseConfig() {
	const config = {
		apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
		authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	};
	
	if (!config.apiKey) {
		throw new Error('Firebase config not found. Please set NEXT_PUBLIC_FIREBASE_* environment variables or create a .env file.');
	}
	
	return config;
}

// Simple parser to extract lesson content from sample data
function parseLessonContent(content, lessonTitle) {
	const lines = content.split('\n');
	let inTargetLesson = false;
	let inContent = false;
	let lessonContent = [];
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		
		// Check if this is our target lesson
		if (trimmed.match(/^Lesson \d+:/) && trimmed.includes(lessonTitle)) {
			inTargetLesson = true;
			continue;
		}
		
		// If we're in the target lesson and see "Lesson Content:"
		if (inTargetLesson && trimmed.startsWith('Lesson Content:')) {
			inContent = true;
			// Content might be on same line or next line
			const afterColon = trimmed.substring(trimmed.indexOf(':') + 1).trim();
			if (afterColon) {
				lessonContent.push(afterColon);
			}
			continue;
		}
		
		// Stop if we hit next lesson or module separator
		if (inTargetLesson && (trimmed.match(/^Lesson \d+:/) || trimmed.startsWith('---') || trimmed.match(/^MODULE \d+:/))) {
			break;
		}
		
		// Accumulate content
		if (inTargetLesson && inContent) {
			lessonContent.push(line);
		}
	}
	
	return lessonContent.join('\n').trim();
}

// Get credentials
async function getCredentials() {
	const args = process.argv.slice(2);
	
	if (args.length >= 2) {
		return { email: args[0], password: args[1] };
	}
	
	if (process.env.FIREBASE_EMAIL && process.env.FIREBASE_PASSWORD) {
		return {
			email: process.env.FIREBASE_EMAIL,
			password: process.env.FIREBASE_PASSWORD
		};
	}
	
	throw new Error('Please provide email and password as arguments or set FIREBASE_EMAIL and FIREBASE_PASSWORD');
}

async function main() {
	try {
		console.log('🚀 Starting lesson content update...\n');
		
		// Try to load environment variables from .env file (optional)
		try {
			const dotenv = await import('dotenv');
			dotenv.config();
		} catch (error) {
			// dotenv not installed, rely on environment variables being set manually
		}
		
		const firebaseConfig = getFirebaseConfig();
		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		const auth = getAuth(app);
		
		const { email, password } = await getCredentials();
		console.log(`🔐 Signing in as: ${email}`);
		await signInWithEmailAndPassword(auth, email, password);
		console.log('✅ Signed in successfully\n');
		
		// Read sample data
		const dataPath = join(process.cwd(), 'SAMPLE_DATA_DATABASE_COURSES.txt');
		const fileContent = await readFile(dataPath, 'utf8');
		
		// Find "Advanced Database Design" course
		const courseQuery = query(collection(db, 'course'), where('title', '==', 'Advanced Database Design'));
		const courseSnapshot = await getDocs(courseQuery);
		
		if (courseSnapshot.empty) {
			throw new Error('Advanced Database Design course not found');
		}
		
		const courseDoc = courseSnapshot.docs[0];
		const courseData = courseDoc.data();
		console.log(`📚 Found course: ${courseData.title} (${courseData.modules?.length || 0} modules)\n`);
		
		// Get modules
		const moduleIds = courseData.modules || [];
		const lessonsToUpdate = [
			{ moduleTitle: 'Database Normalization', lessonTitle: 'Introduction to Normalization' },
			{ moduleTitle: 'Database Relationships and Constraints', lessonTitle: 'Foreign Keys and Referential Integrity' },
			{ moduleTitle: 'Database Optimization', lessonTitle: 'Query Optimization' }
		];
		
		let updatedCount = 0;
		
		for (const moduleId of moduleIds) {
			const moduleDoc = await getDoc(doc(db, 'module', moduleId));
			if (!moduleDoc.exists()) continue;
			
			const moduleData = moduleDoc.data();
			const targetLesson = lessonsToUpdate.find(l => l.moduleTitle === moduleData.title);
			if (!targetLesson) continue;
			
			console.log(`\n📦 Module: ${moduleData.title}`);
			
			// Get first lesson of this module
			const lessonIds = moduleData.lessons || [];
			if (lessonIds.length === 0) {
				console.log('  ⚠️  No lessons in this module');
				continue;
			}
			
			const firstLessonId = lessonIds[0];
			const lessonDoc = await getDoc(doc(db, 'lesson', firstLessonId));
			if (!lessonDoc.exists()) {
				console.log('  ⚠️  First lesson not found');
				continue;
			}
			
			const lessonData = lessonDoc.data();
			console.log(`  📄 Lesson: ${lessonData.title}`);
			
			// Check if content already exists
			if (lessonData.contentHtml && lessonData.contentHtml.trim().length > 0) {
				console.log('  ✅ Lesson already has content, skipping');
				continue;
			}
			
			// Parse content from sample data
			const content = parseLessonContent(fileContent, targetLesson.lessonTitle);
			
			if (!content || content.length === 0) {
				console.log('  ⚠️  No content found in sample data');
				continue;
			}
			
			// Update lesson
			await updateDoc(doc(db, 'lesson', firstLessonId), {
				contentHtml: content,
				content: content,
				updatedAt: new Date()
			});
			
			console.log(`  ✅ Updated with ${content.length} characters of content`);
			updatedCount++;
		}
		
		console.log(`\n🎉 Update complete! Updated ${updatedCount} lessons.\n`);
		process.exit(0);
		
	} catch (error) {
		console.error('\n❌ Error updating lessons:');
		console.error(error.message);
		if (error.code) {
			console.error(`Error code: ${error.code}`);
		}
		process.exit(1);
	}
}

main();

