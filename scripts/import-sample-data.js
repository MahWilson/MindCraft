/**
 * Script to import sample database courses data into Firestore
 * 
 * Usage: node scripts/import-sample-data.js
 * 
 * This script reads SAMPLE_DATA_DATABASE_COURSES.txt and creates:
 * - Courses in the 'course' collection
 * - Modules in the 'module' collection (linked to courses)
 * - Lessons in the 'lesson' collection (linked to modules)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Try to load environment variables from .env file (optional)
// Note: dotenv is optional - you can also set environment variables manually
try {
	const dotenv = await import('dotenv');
	dotenv.config();
} catch (error) {
	// dotenv not installed, rely on environment variables being set manually
	// This is fine - you can set FIREBASE_EMAIL and FIREBASE_PASSWORD as env vars
}

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

// Parse the sample data file
function parseSampleData(content) {
	const courses = [];
	const lines = content.split('\n');
	
	let currentCourse = null;
	let currentModule = null;
	let currentLesson = null;
	let inLessonContent = false;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		
		// Skip empty lines and course/module separators (but keep lesson content)
		if (!trimmed || trimmed.startsWith('===')) {
			// Empty lines or course separators - continue accumulating content if in lesson
			if (currentLesson && inLessonContent) {
				currentLesson.content += '\n';
			}
			continue;
		}
		
		// Module separator - save current lesson if exists
		if (trimmed.startsWith('---')) {
			if (currentLesson && currentModule) {
				currentModule.lessons.push(currentLesson);
				currentLesson = null;
				inLessonContent = false;
			}
			continue;
		}
		
		// Course header (COURSE 1:, COURSE 2:, etc.)
		if (trimmed.match(/^COURSE \d+:/)) {
			// Save previous course if exists
			if (currentCourse) {
				// Save last module and lesson
				if (currentLesson && currentModule) {
					currentModule.lessons.push(currentLesson);
				}
				if (currentModule && currentCourse) {
					currentCourse.modules.push(currentModule);
				}
				courses.push(currentCourse);
			}
			currentCourse = {
				title: '',
				description: '',
				status: 'published',
				modules: []
			};
			currentModule = null;
			currentLesson = null;
			inLessonContent = false;
		}
		// Course Title
		else if (trimmed.startsWith('Course Title:')) {
			if (currentCourse) {
				currentCourse.title = trimmed.replace('Course Title:', '').trim();
			}
		}
		// Course Description
		else if (trimmed.startsWith('Course Description:')) {
			if (currentCourse) {
				currentCourse.description = trimmed.replace('Course Description:', '').trim();
			}
		}
		// Course Status
		else if (trimmed.startsWith('Status:')) {
			if (currentCourse) {
				currentCourse.status = trimmed.replace('Status:', '').trim();
			}
		}
		// Module header (MODULE 1:, MODULE 2:, etc.)
		else if (trimmed.match(/^MODULE \d+:/)) {
			// Save previous module if exists
			if (currentModule && currentCourse) {
				// Save last lesson
				if (currentLesson) {
					currentModule.lessons.push(currentLesson);
					currentLesson = null;
				}
				currentCourse.modules.push(currentModule);
			}
			currentModule = {
				title: '',
				order: 0,
				lessons: []
			};
			currentLesson = null;
			inLessonContent = false;
		}
		// Module Title
		else if (trimmed.startsWith('Module Title:')) {
			if (currentModule) {
				currentModule.title = trimmed.replace('Module Title:', '').trim();
			}
		}
		// Module Order
		else if (trimmed.startsWith('Module Order:')) {
			if (currentModule) {
				currentModule.order = parseInt(trimmed.replace('Module Order:', '').trim()) || 0;
			}
		}
		// Lesson header (Lesson 1:, Lesson 2:, etc.)
		else if (trimmed.match(/^Lesson \d+:/)) {
			// Save previous lesson if exists
			if (currentLesson && currentModule) {
				currentModule.lessons.push(currentLesson);
			}
			const lessonMatch = trimmed.match(/^Lesson (\d+):\s*(.+)/);
			if (lessonMatch && currentModule) {
				currentLesson = {
					title: lessonMatch[2].trim(),
					order: parseInt(lessonMatch[1]) || 0,
					content: ''
				};
				inLessonContent = false;
			}
		}
		// Lesson Title
		else if (trimmed.startsWith('Lesson Title:')) {
			if (currentLesson) {
				currentLesson.title = trimmed.replace('Lesson Title:', '').trim();
			}
		}
		// Lesson Order
		else if (trimmed.startsWith('Lesson Order:')) {
			if (currentLesson) {
				currentLesson.order = parseInt(trimmed.replace('Lesson Order:', '').trim()) || 0;
			}
		}
		// Lesson Content marker
		else if (trimmed.startsWith('Lesson Content:')) {
			if (currentLesson) {
				inLessonContent = true;
				currentLesson.content = '';
			}
		}
		// Accumulate lesson content (preserve all lines including empty ones)
		else if (currentLesson && inLessonContent) {
			// Don't stop on empty lines - they're part of the content
			if (currentLesson.content) {
				currentLesson.content += '\n' + line;
			} else {
				currentLesson.content = line;
			}
		}
		// If we're in a lesson section but haven't seen "Lesson Content:" yet, start accumulating
		else if (currentLesson && !inLessonContent && trimmed && !trimmed.includes(':')) {
			// This might be content, start accumulating
			inLessonContent = true;
			currentLesson.content = line;
		}
	}
	
	// Don't forget the last items
	if (currentLesson && currentModule) {
		currentModule.lessons.push(currentLesson);
	}
	if (currentModule && currentCourse) {
		currentCourse.modules.push(currentModule);
	}
	if (currentCourse) {
		courses.push(currentCourse);
	}
	
	return courses;
}

// Import data into Firestore
async function importData(db, auth, courses) {
	const user = auth.currentUser;
	if (!user) {
		throw new Error('User not authenticated');
	}
	
	console.log(`\n📚 Starting import of ${courses.length} courses...\n`);
	
	for (let courseIndex = 0; courseIndex < courses.length; courseIndex++) {
		const courseData = courses[courseIndex];
		
		console.log(`\n[${courseIndex + 1}/${courses.length}] Creating course: "${courseData.title}"`);
		
		// Create course
		const courseDoc = {
			title: courseData.title,
			description: courseData.description || '',
			status: courseData.status || 'published',
			modules: [], // Will be populated with module IDs
			createdBy: user.uid,
			authorName: 'System',
			authorEmail: user.email || '',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};
		
		const courseRef = await addDoc(collection(db, 'course'), courseDoc);
		console.log(`  ✅ Course created: ${courseRef.id}`);
		
		const moduleIds = [];
		
		// Create modules for this course
		for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
			const moduleData = courseData.modules[moduleIndex];
			
			console.log(`  📦 Creating module ${moduleIndex + 1}: "${moduleData.title}"`);
			
			const moduleDoc = {
				title: moduleData.title,
				order: moduleData.order || moduleIndex,
				lessons: [], // Will be populated with lesson IDs
				courseId: courseRef.id,
				createdBy: user.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};
			
			const moduleRef = await addDoc(collection(db, 'module'), moduleDoc);
			moduleIds.push(moduleRef.id);
			console.log(`    ✅ Module created: ${moduleRef.id}`);
			
			const lessonIds = [];
			
			// Create lessons for this module
			for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
				const lessonData = moduleData.lessons[lessonIndex];
				
				console.log(`    📄 Creating lesson ${lessonIndex + 1}: "${lessonData.title}"`);
				
				// Clean up content - remove leading/trailing whitespace
				const content = (lessonData.content || '').trim();
				const hasContent = content.length > 0;
				const contentPreview = hasContent ? content.substring(0, 50).replace(/\n/g, ' ') + '...' : '(empty)';
				
				const lessonDoc = {
					title: lessonData.title,
					contentHtml: content, // Store as contentHtml for display
					content: content, // Keep both for compatibility
					order: lessonData.order || lessonIndex,
					moduleId: moduleRef.id,
					courseId: courseRef.id,
					createdBy: user.uid,
					materials: [],
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				};
				
				const lessonRef = await addDoc(collection(db, 'lesson'), lessonDoc);
				lessonIds.push(lessonRef.id);
				console.log(`      ✅ Lesson created: ${lessonRef.id} (content: ${contentPreview})`);
			}
			
			// Update module with lesson IDs
			await updateDoc(moduleRef, {
				lessons: lessonIds,
				updatedAt: serverTimestamp(),
			});
		}
		
		// Update course with module IDs
		await updateDoc(courseRef, {
			modules: moduleIds,
			updatedAt: serverTimestamp(),
		});
		
		console.log(`  ✅ Course "${courseData.title}" completed with ${moduleIds.length} modules\n`);
	}
	
	console.log(`\n🎉 Import completed! Created ${courses.length} courses.\n`);
}

// Get credentials from command line arguments or prompt
async function getCredentials() {
	// Check command line arguments: node script.js email password
	const args = process.argv.slice(2);
	
	if (args.length >= 2) {
		return {
			email: args[0],
			password: args[1]
		};
	}
	
	// If not provided, try environment variables as fallback
	if (process.env.FIREBASE_EMAIL && process.env.FIREBASE_PASSWORD) {
		return {
			email: process.env.FIREBASE_EMAIL,
			password: process.env.FIREBASE_PASSWORD
		};
	}
	
	// Prompt for credentials interactively
	console.log('\n📝 Please provide your Firebase Auth credentials:');
	console.log('   (Tip: You can also pass them as arguments: node scripts/import-sample-data.js email@example.com password)\n');
	
	const readline = await import('readline');
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	return new Promise((resolve) => {
		rl.question('Email: ', (email) => {
			rl.question('Password: ', (password) => {
				rl.close();
				resolve({ 
					email: email.trim(), 
					password: password.trim() 
				});
			});
		});
	});
}

// Main function
async function main() {
	try {
		console.log('🚀 Starting sample data import...\n');
		
		// Load Firebase config
		console.log('📋 Loading Firebase configuration...');
		const firebaseConfig = getFirebaseConfig();
		
		// Initialize Firebase
		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		const auth = getAuth(app);
		
		// Get credentials
		const { email, password } = await getCredentials();
		
		if (!email || !password) {
			throw new Error('Email and password are required.');
		}
		
		console.log(`\n🔐 Signing in as: ${email}`);
		await signInWithEmailAndPassword(auth, email, password);
		console.log('✅ Signed in successfully\n');
		
		// Read sample data file
		const dataPath = join(process.cwd(), 'SAMPLE_DATA_DATABASE_COURSES.txt');
		console.log('📖 Reading sample data file...');
		const fileContent = await readFile(dataPath, 'utf8');
		
		// Parse data
		console.log('🔍 Parsing sample data...');
		const courses = parseSampleData(fileContent);
		
		if (courses.length === 0) {
			throw new Error('No courses found in sample data file');
		}
		
		console.log(`✅ Parsed ${courses.length} courses:`);
		courses.forEach((course, index) => {
			const moduleCount = course.modules?.length || 0;
			const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
			console.log(`   ${index + 1}. ${course.title} (${moduleCount} modules, ${lessonCount} lessons)`);
		});
		
		// Filter: Only import "Advanced Database Design" course
		const targetCourse = courses.find(c => c.title === 'Advanced Database Design');
		if (!targetCourse) {
			throw new Error('Advanced Database Design course not found in sample data');
		}
		
		// Filter: Only keep first lesson of each module
		targetCourse.modules = targetCourse.modules.map(module => ({
			...module,
			lessons: module.lessons.slice(0, 1) // Only first lesson
		}));
		
		const filteredCourses = [targetCourse];
		const totalLessons = filteredCourses[0].modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
		console.log(`\n📝 Filtered to: "${targetCourse.title}" with ${targetCourse.modules.length} modules, ${totalLessons} lessons (first lesson only)\n`);
		
		// Import data
		await importData(db, auth, filteredCourses);
		
		console.log('✨ All done! You can now view the courses in your application.\n');
		process.exit(0);
		
	} catch (error) {
		console.error('\n❌ Error importing data:');
		console.error(error.message);
		if (error.code) {
			console.error(`Error code: ${error.code}`);
		}
		console.error('\nStack trace:', error.stack);
		process.exit(1);
	}
}

// Run the script
main();

