/**
 * Migration Script: Move JSON data to Firestore
 * 
 * This script helps migrate existing data from local JSON files to Firestore.
 * 
 * IMPORTANT: Users must be created in Firebase Auth FIRST before running this script.
 * 
 * Steps:
 * 1. Create users in Firebase Auth (via console or app)
 * 2. Run this script to migrate courses and link users
 * 
 * Usage:
 *   node scripts/migrate-to-firestore.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config from environment
const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateUsers() {
	console.log('\n📋 Migrating Users...');
	
	try {
		const usersPath = path.join(__dirname, '..', 'data', 'users.json');
		const usersRaw = await readFile(usersPath, 'utf8');
		const users = JSON.parse(usersRaw);
		
		console.log(`Found ${users.length} users in JSON file`);
		console.log('\n⚠️  IMPORTANT: Users must be created in Firebase Auth FIRST!');
		console.log('   After creating users in Firebase Auth, note their UIDs.');
		console.log('   Then update the migration mapping below.\n');
		
		// User mapping: JSON email -> Firebase UID
		// TODO: Update this mapping after creating users in Firebase Auth
		const userMapping = {
			'student1@gmail.com': 'PASTE_STUDENT1_UID_HERE',
			'teach1@gmail.com': 'PASTE_TEACH1_UID_HERE',
		};
		
		for (const user of users) {
			const uid = userMapping[user.email];
			if (!uid || uid.includes('PASTE')) {
				console.log(`⚠️  Skipping ${user.email} - UID not mapped yet`);
				continue;
			}
			
			// Create user profile in Firestore
			await setDoc(doc(db, 'user', uid), {
				name: user.name,
				email: user.email,
				role: user.role,
				status: 'active',
				createdAt: user.createdAt ? new Date(user.createdAt) : serverTimestamp(),
			});
			
			console.log(`✅ Migrated user: ${user.name} (${user.email})`);
		}
	} catch (err) {
		console.error('❌ Error migrating users:', err.message);
	}
}

async function migrateCourses() {
	console.log('\n📚 Migrating Courses...');
	
	try {
		const coursesPath = path.join(__dirname, '..', 'data', 'courses.json');
		const coursesRaw = await readFile(coursesPath, 'utf8');
		const courses = JSON.parse(coursesRaw);
		
		console.log(`Found ${courses.length} courses in JSON file`);
		
		// User mapping for courses (JSON id -> Firebase UID)
		// Update this after migrating users
		const userMapping = {
			'29c13350-077c-4ba1-985c-f4087013c07b': 'PASTE_TEACH1_UID_HERE',
		};
		
		for (const course of courses) {
			// Convert createdBy to Firebase UID if it exists
			let createdBy = course.createdBy;
			if (createdBy && userMapping[createdBy] && !userMapping[createdBy].includes('PASTE')) {
				createdBy = userMapping[createdBy];
			} else if (createdBy) {
				console.log(`⚠️  Course "${course.title}" has createdBy=${createdBy} but UID not mapped`);
				createdBy = null; // Set to null if mapping not found
			}
			
			const courseData = {
				title: course.title,
				description: course.description || '',
				status: course.status,
				modules: course.modules || [],
				createdBy: createdBy,
				authorName: course.authorName || 'Unknown',
				authorEmail: course.authorEmail || '',
				createdAt: course.createdAt ? new Date(course.createdAt) : serverTimestamp(),
				updatedAt: course.updatedAt ? new Date(course.updatedAt) : serverTimestamp(),
			};
			
			await addDoc(collection(db, 'course'), courseData);
			console.log(`✅ Migrated course: "${course.title}"`);
		}
	} catch (err) {
		console.error('❌ Error migrating courses:', err.message);
	}
}

async function main() {
	console.log('🚀 Starting Migration to Firestore...\n');
	console.log('Make sure you have:');
	console.log('1. ✅ Created users in Firebase Auth');
	console.log('2. ✅ Updated userMapping in this script');
	console.log('3. ✅ Set up .env with Firebase config\n');
	
	try {
		await migrateUsers();
		await migrateCourses();
		console.log('\n✅ Migration complete!');
		console.log('\n📝 Next steps:');
		console.log('1. Verify data in Firebase Console');
		console.log('2. Test login with migrated users');
		console.log('3. Archive or delete old JSON files (optional)');
	} catch (err) {
		console.error('\n❌ Migration failed:', err);
		process.exit(1);
	}
}

main();

