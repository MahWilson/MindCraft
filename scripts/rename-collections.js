/**
 * Migration Script: Rename Firestore Collections from Plural to Singular
 * 
 * This script migrates all documents from plural collection names to singular ones:
 * - users → user
 * - courses → course
 * - modules → module
 * - lessons → lesson
 * - enrollments → enrollment
 * - assessments → assessment
 * - assignments → assignment
 * - submissions → submission
 * - settings → setting
 * 
 * IMPORTANT:
 * 1. Make sure you have updated your Firestore Security Rules to allow writes
 * 2. Run this script in a safe environment (test first!)
 * 3. The script preserves document IDs and all data
 * 4. Old collections are NOT deleted automatically (you can delete them manually after verification)
 * 
 * Usage:
 *   node scripts/rename-collections.js
 * 
 * To delete old collections after migration:
 *   node scripts/rename-collections.js --delete-old
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
	getFirestore, 
	collection, 
	getDocs, 
	doc, 
	setDoc, 
	deleteDoc,
	writeBatch,
	query,
	limit
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
async function loadEnv() {
	// Try to load dotenv if available
	try {
		const dotenv = await import('dotenv');
		dotenv.default.config();
		return true;
	} catch (error) {
		// dotenv not installed - try to read .env manually
		try {
			const envPath = join(__dirname, '..', '.env');
			if (existsSync(envPath)) {
				const envFile = readFileSync(envPath, 'utf8');
				envFile.split('\n').forEach(line => {
					const trimmed = line.trim();
					if (trimmed && !trimmed.startsWith('#')) {
						const [key, ...valueParts] = trimmed.split('=');
						if (key && valueParts.length > 0) {
							const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
							process.env[key.trim()] = value;
						}
					}
				});
				console.log('✅ Loaded .env file manually');
				return true;
			}
		} catch (e) {
			console.log('⚠️  Could not load .env file automatically.');
			return false;
		}
	}
	return false;
}

// Load environment variables before using them
const envLoaded = await loadEnv();

// Load Firebase config from environment
const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
	console.error('\n❌ Missing Firebase configuration!');
	console.error('\nPlease make sure:');
	console.error('1. You have a .env file in the project root');
	console.error('2. The .env file contains:');
	console.error('   NEXT_PUBLIC_FIREBASE_API_KEY=...');
	console.error('   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...');
	console.error('   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...');
	console.error('   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...');
	console.error('   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...');
	console.error('   NEXT_PUBLIC_FIREBASE_APP_ID=...');
	console.error('\nOr install dotenv for better .env support:');
	console.error('   npm install dotenv\n');
	process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Authenticate with Firebase Auth
 * The script needs to be authenticated to access Firestore
 */
async function authenticate() {
	// Try to get credentials from environment variables first
	const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
	const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;
	
	if (adminEmail && adminPassword) {
		console.log('🔐 Authenticating with environment variables...');
		try {
			await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
			console.log('✅ Authenticated successfully!\n');
			return true;
		} catch (error) {
			console.error('❌ Authentication failed:', error.message);
			return false;
		}
	}
	
	// If no env vars, prompt for credentials
	const readline = await import('readline');
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	return new Promise((resolve) => {
		console.log('\n🔐 Authentication Required');
		console.log('The script needs to sign in to Firebase to access Firestore.');
		console.log('Please enter your admin/teacher credentials:\n');
		
		rl.question('Email: ', (email) => {
			rl.question('Password: ', async (password) => {
				rl.close();
				try {
					console.log('\n🔐 Signing in...');
					await signInWithEmailAndPassword(auth, email, password);
					console.log('✅ Authenticated successfully!\n');
					resolve(true);
				} catch (error) {
					console.error('❌ Authentication failed:', error.message);
					console.error('\nMake sure:');
					console.error('1. The user exists in Firebase Auth');
					console.error('2. The user has admin or teacher role');
					console.error('3. The password is correct');
					console.error('\nOr set environment variables:');
					console.error('   FIREBASE_ADMIN_EMAIL=your@email.com');
					console.error('   FIREBASE_ADMIN_PASSWORD=yourpassword\n');
					resolve(false);
				}
			});
		});
	});
}

// Collection mapping: old (plural) → new (singular)
const COLLECTION_MAPPING = {
	'users': 'user',
	'courses': 'course',
	'modules': 'module',
	'lessons': 'lesson',
	'enrollments': 'enrollment',
	'assessments': 'assessment',
	'assignments': 'assignment',
	'submissions': 'submission',
	'settings': 'setting',
};

// Check if --delete-old flag is set
const DELETE_OLD = process.argv.includes('--delete-old');

/**
 * Migrate a single collection
 */
async function migrateCollection(oldName, newName) {
	console.log(`\n📦 Migrating ${oldName} → ${newName}...`);
	
	try {
		// Get all documents from old collection
		const oldCollectionRef = collection(db, oldName);
		const snapshot = await getDocs(oldCollectionRef);
		
		if (snapshot.empty) {
			console.log(`   ⚠️  Collection "${oldName}" is empty, skipping...`);
			return { migrated: 0, errors: 0 };
		}
		
		console.log(`   📄 Found ${snapshot.size} document(s)`);
		
		let migrated = 0;
		let errors = 0;
		
		// Use batch writes for efficiency (Firestore limit is 500 per batch)
		const batchSize = 500;
		const docs = snapshot.docs;
		
		for (let i = 0; i < docs.length; i += batchSize) {
			const batch = writeBatch(db);
			const batchDocs = docs.slice(i, i + batchSize);
			
			for (const oldDoc of batchDocs) {
				try {
					// Get document data
					const data = oldDoc.data();
					
					// Preserve document ID
					const newDocRef = doc(db, newName, oldDoc.id);
					
					// Write to new collection
					batch.set(newDocRef, data);
					
					migrated++;
				} catch (error) {
					console.error(`   ❌ Error migrating document ${oldDoc.id}:`, error.message);
					errors++;
				}
			}
			
			// Commit batch
			try {
				await batch.commit();
				console.log(`   ✅ Migrated batch ${Math.floor(i / batchSize) + 1} (${batchDocs.length} documents)`);
			} catch (error) {
				console.error(`   ❌ Error committing batch:`, error.message);
				errors += batchDocs.length;
			}
		}
		
		console.log(`   ✅ Migration complete: ${migrated} migrated, ${errors} errors`);
		
		// Delete old collection if flag is set
		if (DELETE_OLD && errors === 0) {
			console.log(`   🗑️  Deleting old collection "${oldName}"...`);
			const deleteBatch = writeBatch(db);
			let deleteCount = 0;
			
			for (const oldDoc of docs) {
				try {
					const oldDocRef = doc(db, oldName, oldDoc.id);
					deleteBatch.delete(oldDocRef);
					deleteCount++;
				} catch (error) {
					console.error(`   ❌ Error deleting document ${oldDoc.id}:`, error.message);
				}
			}
			
			// Commit delete batch
			try {
				await deleteBatch.commit();
				console.log(`   ✅ Deleted ${deleteCount} documents from "${oldName}"`);
			} catch (error) {
				console.error(`   ❌ Error deleting collection:`, error.message);
			}
		}
		
		return { migrated, errors };
	} catch (error) {
		console.error(`   ❌ Error migrating collection "${oldName}":`, error.message);
		return { migrated: 0, errors: 1 };
	}
}

/**
 * Main migration function
 */
async function main() {
	console.log('🚀 Starting Collection Rename Migration...\n');
	
	// Authenticate first
	const authenticated = await authenticate();
	if (!authenticated) {
		console.error('\n❌ Authentication failed. Cannot proceed with migration.');
		process.exit(1);
	}
	
	console.log('This will migrate:');
	Object.entries(COLLECTION_MAPPING).forEach(([old, newName]) => {
		console.log(`   ${old} → ${newName}`);
	});
	
	if (DELETE_OLD) {
		console.log('\n⚠️  WARNING: --delete-old flag is set. Old collections will be deleted after migration!');
	} else {
		console.log('\nℹ️  Old collections will be preserved. Use --delete-old to delete them after verification.');
	}
	
	console.log('\n📋 Starting migration...\n');
	
	const results = {};
	let totalMigrated = 0;
	let totalErrors = 0;
	
	// Migrate each collection
	for (const [oldName, newName] of Object.entries(COLLECTION_MAPPING)) {
		const result = await migrateCollection(oldName, newName);
		results[oldName] = result;
		totalMigrated += result.migrated;
		totalErrors += result.errors;
		
		// Small delay to avoid rate limiting
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	
	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('📊 Migration Summary');
	console.log('='.repeat(60));
	
	Object.entries(results).forEach(([oldName, result]) => {
		const status = result.errors === 0 ? '✅' : '⚠️';
		console.log(`${status} ${oldName}: ${result.migrated} migrated, ${result.errors} errors`);
	});
	
	console.log('='.repeat(60));
	console.log(`Total: ${totalMigrated} documents migrated, ${totalErrors} errors`);
	
	if (totalErrors === 0) {
		console.log('\n✅ Migration completed successfully!');
		console.log('\n📝 Next steps:');
		console.log('1. Verify data in Firebase Console (check new singular collections)');
		console.log('2. Update Firestore Security Rules (already done in code)');
		console.log('3. Update Storage Rules (already done in code)');
		console.log('4. Test your application');
		
		if (!DELETE_OLD) {
			console.log('5. After verification, delete old collections manually or run with --delete-old flag');
		} else {
			console.log('5. Old collections have been deleted');
		}
	} else {
		console.log('\n⚠️  Migration completed with errors. Please review and fix issues.');
	}
}

// Run migration
main()
	.then(() => {
		console.log('\n✨ Done!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Migration failed:', error);
		process.exit(1);
	});

