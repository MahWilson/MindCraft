// Script to check what files have been added/modified
// Helps identify changes before merging

const fs = require('fs');
const path = require('path');

// Files and directories to ignore
const IGNORE_PATTERNS = [
	'node_modules',
	'.next',
	'.git',
	'package-lock.json',
	'.env',
	'.env.local',
	'*.log'
];

function shouldIgnore(filePath) {
	return IGNORE_PATTERNS.some(pattern => {
		if (pattern.includes('*')) {
			return filePath.endsWith(pattern.replace('*', ''));
		}
		return filePath.includes(pattern);
	});
}

function getFileStats(filePath) {
	try {
		const stats = fs.statSync(filePath);
		return {
			path: filePath,
			size: stats.size,
			modified: stats.mtime,
			isDirectory: stats.isDirectory()
		};
	} catch (err) {
		return null;
	}
}

function scanDirectory(dir, baseDir = '') {
	const results = {
		files: [],
		directories: []
	};
	
	try {
		const items = fs.readdirSync(dir);
		
		for (const item of items) {
			const fullPath = path.join(dir, item);
			const relativePath = path.join(baseDir, item);
			
			if (shouldIgnore(relativePath)) {
				continue;
			}
			
			const stats = getFileStats(fullPath);
			if (!stats) continue;
			
			if (stats.isDirectory) {
				results.directories.push(relativePath);
				const subResults = scanDirectory(fullPath, relativePath);
				results.files.push(...subResults.files);
				results.directories.push(...subResults.directories);
			} else {
				results.files.push({
					path: relativePath,
					size: stats.size,
					modified: stats.modified
				});
			}
		}
	} catch (err) {
		console.error(`Error scanning ${dir}:`, err.message);
	}
	
	return results;
}

// Categorize files by type
function categorizeFiles(files) {
	const categories = {
		newFeatures: [],
		apiRoutes: [],
		components: [],
		pages: [],
		docs: [],
		scripts: [],
		config: [],
		other: []
	};
	
	files.forEach(file => {
		const filePath = file.path.toLowerCase();
		
		if (filePath.includes('recommendations')) {
			categories.newFeatures.push(file);
		} else if (filePath.includes('api/')) {
			categories.apiRoutes.push(file);
		} else if (filePath.includes('components/') || filePath.includes('app/components/')) {
			categories.components.push(file);
		} else if (filePath.includes('app/') && (filePath.includes('/page.jsx') || filePath.includes('/page.js'))) {
			categories.pages.push(file);
		} else if (filePath.includes('docs/')) {
			categories.docs.push(file);
		} else if (filePath.includes('scripts/')) {
			categories.scripts.push(file);
		} else if (filePath.includes('package.json') || filePath.includes('tailwind') || filePath.includes('next.config')) {
			categories.config.push(file);
		} else {
			categories.other.push(file);
		}
	});
	
	return categories;
}

function main() {
	console.log('🔍 Scanning project for changes...\n');
	
	const rootDir = process.cwd();
	const results = scanDirectory(rootDir);
	
	console.log(`📊 Found ${results.files.length} files\n`);
	
	const categories = categorizeFiles(results.files);
	
	console.log('📁 File Categories:');
	console.log('='.repeat(60));
	console.log(`\n✨ New Features:`);
	categories.newFeatures.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n🔌 API Routes:`);
	categories.apiRoutes.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n🧩 Components:`);
	categories.components.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n📄 Pages:`);
	categories.pages.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n📚 Documentation:`);
	categories.docs.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n🔧 Scripts:`);
	categories.scripts.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	console.log(`\n⚙️  Config Files:`);
	categories.config.forEach(file => {
		console.log(`   - ${file.path}`);
	});
	
	if (categories.other.length > 0) {
		console.log(`\n📦 Other:`);
		categories.other.forEach(file => {
			console.log(`   - ${file.path}`);
		});
	}
	
	// Summary of key changes
	console.log('\n\n📋 Summary of Key Changes:');
	console.log('='.repeat(60));
	console.log('\n✨ New Features Added:');
	console.log('   1. Learning Recommendations Page (/recommendations)');
	console.log('   2. Download functionality (PDF/TXT) for lessons');
	console.log('   3. Schema compatibility helpers');
	console.log('   4. Learning recommendations API endpoint');
	
	console.log('\n🔧 Modified Features:');
	console.log('   1. Student dashboard (added recommendations section)');
	console.log('   2. Course pages (schema compatibility fixes)');
	console.log('   3. Navigation (added Recommendations menu item)');
	
	console.log('\n📚 New Documentation:');
	console.log('   1. Git merge strategy guide');
	console.log('   2. Schema compatibility guide');
	
	console.log('\n💡 Next Steps:');
	console.log('   1. Initialize git repo (if not done)');
	console.log('   2. Create feature branch: git checkout -b feature/my-changes');
	console.log('   3. Commit your changes');
	console.log('   4. Fetch from origin: git fetch origin');
	console.log('   5. Merge origin/main into your branch');
	console.log('   6. Resolve conflicts');
	console.log('   7. Push and create PR');
}

main();

