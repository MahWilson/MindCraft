// Script to check database schema compatibility
// Run this to identify potential schema mismatches

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function getCredentials() {
	return new Promise((resolve) => {
		rl.question('Enter Firebase API Key: ', (apiKey) => {
			rl.question('Enter Firebase Auth Domain: ', (authDomain) => {
				rl.question('Enter Firebase Project ID: ', (projectId) => {
					rl.question('Enter Firebase Storage Bucket: ', (storageBucket) => {
						rl.question('Enter Firebase Messaging Sender ID: ', (messagingSenderId) => {
							rl.question('Enter Firebase App ID: ', (appId) => {
								rl.close();
								resolve({
									apiKey,
									authDomain,
									projectId,
									storageBucket,
									messagingSenderId,
									appId
								});
							});
						});
					});
				});
			});
		});
	});
}

async function checkSchema() {
	try {
		console.log('🔍 Checking database schema compatibility...\n');
		
		const credentials = await getCredentials();
		
		const firebaseConfig = {
			apiKey: credentials.apiKey,
			authDomain: credentials.authDomain,
			projectId: credentials.projectId,
			storageBucket: credentials.storageBucket,
			messagingSenderId: credentials.messagingSenderId,
			appId: credentials.appId
		};
		
		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		
		// Check enrollment schema
		console.log('📋 Checking enrollment collection...');
		const enrollmentsSnapshot = await getDocs(collection(db, 'enrollment'));
		let oldSchemaCount = 0;
		let newSchemaCount = 0;
		let issues = [];
		
		enrollmentsSnapshot.forEach((doc) => {
			const data = doc.data();
			if (data.progress && typeof data.progress === 'object') {
				newSchemaCount++;
			} else if (data.completedLessons || data.completedModules) {
				oldSchemaCount++;
				issues.push({
					docId: doc.id,
					type: 'enrollment',
					issue: 'Uses old flat schema (completedLessons/completedModules at root)',
					data: data
				});
			}
		});
		
		console.log(`  ✅ New schema (nested progress): ${newSchemaCount}`);
		console.log(`  ⚠️  Old schema (flat): ${oldSchemaCount}`);
		
		// Check course schema
		console.log('\n📋 Checking course collection...');
		const coursesSnapshot = await getDocs(collection(db, 'course'));
		let courseIssues = [];
		
		coursesSnapshot.forEach((doc) => {
			const data = doc.data();
			const expectedFields = ['title', 'description', 'status', 'createdBy', 'createdAt'];
			const missingFields = expectedFields.filter(field => !(field in data));
			
			if (missingFields.length > 0) {
				courseIssues.push({
					docId: doc.id,
					type: 'course',
					issue: `Missing fields: ${missingFields.join(', ')}`,
					data: data
				});
			}
		});
		
		console.log(`  ✅ Courses checked: ${coursesSnapshot.size}`);
		if (courseIssues.length > 0) {
			console.log(`  ⚠️  Issues found: ${courseIssues.length}`);
		}
		
		// Check lesson schema
		console.log('\n📋 Checking lesson collection...');
		const lessonsSnapshot = await getDocs(collection(db, 'lesson'));
		let lessonIssues = [];
		
		lessonsSnapshot.forEach((doc) => {
			const data = doc.data();
			// Check if has contentHtml (new) or just content (old)
			if (!data.contentHtml && !data.content) {
				lessonIssues.push({
					docId: doc.id,
					type: 'lesson',
					issue: 'Missing content/contentHtml field',
					data: data
				});
			}
		});
		
		console.log(`  ✅ Lessons checked: ${lessonsSnapshot.size}`);
		if (lessonIssues.length > 0) {
			console.log(`  ⚠️  Issues found: ${lessonIssues.length}`);
		}
		
		// Summary
		console.log('\n📊 Summary:');
		console.log('='.repeat(50));
		console.log(`Total enrollment documents: ${enrollmentsSnapshot.size}`);
		console.log(`  - New schema: ${newSchemaCount}`);
		console.log(`  - Old schema: ${oldSchemaCount}`);
		console.log(`Total course documents: ${coursesSnapshot.size}`);
		console.log(`Total lesson documents: ${lessonsSnapshot.size}`);
		
		if (issues.length > 0 || courseIssues.length > 0 || lessonIssues.length > 0) {
			console.log('\n⚠️  Schema Compatibility Issues Found:');
			console.log('='.repeat(50));
			
			[...issues, ...courseIssues, ...lessonIssues].forEach((issue, index) => {
				console.log(`\n${index + 1}. ${issue.type.toUpperCase()} - ${issue.docId}`);
				console.log(`   Issue: ${issue.issue}`);
			});
			
			console.log('\n💡 Recommendation:');
			console.log('   Add backward compatibility code to handle both old and new schemas.');
			console.log('   See docs/GIT_MERGE_STRATEGY.md for migration strategies.');
		} else {
			console.log('\n✅ No schema compatibility issues detected!');
		}
		
	} catch (error) {
		console.error('❌ Error checking schema:', error);
		process.exit(1);
	}
}

checkSchema();

