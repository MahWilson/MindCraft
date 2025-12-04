#!/usr/bin/env node
/**
 * Safe File Extraction Script
 * Extracts specific files from a branch without merging the entire branch
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractFiles(branch, files) {
  console.log(`\n📦 Extracting files from ${branch}...\n`);
  
  const extracted = [];
  const failed = [];
  
  for (const file of files) {
    try {
      // Check if file exists in branch
      const checkCmd = `git ls-tree -r ${branch} --name-only | grep -E "^${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$"`;
      try {
        execSync(checkCmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch {
        console.log(`⚠️  File not found in branch: ${file}`);
        failed.push({ file, reason: 'Not found in branch' });
        continue;
      }
      
      // Check if file exists locally and is different
      if (fs.existsSync(file)) {
        try {
          const localHash = execSync(`git hash-object ${file}`, { encoding: 'utf-8' }).trim();
          const remoteHash = execSync(`git ls-tree ${branch} ${file}`, { encoding: 'utf-8' }).split(/\s+/)[2];
          
          if (localHash === remoteHash) {
            console.log(`✓ ${file} - Already up to date`);
            continue;
          }
          
          console.log(`⚠️  ${file} - EXISTS locally, will be overwritten`);
        } catch (err) {
          console.log(`⚠️  ${file} - EXISTS locally, will be overwritten`);
        }
      }
      
      // Extract file
      execSync(`git checkout ${branch} -- ${file}`, { stdio: 'inherit' });
      console.log(`✓ Extracted: ${file}`);
      extracted.push(file);
    } catch (err) {
      console.error(`✗ Failed to extract ${file}:`, err.message);
      failed.push({ file, reason: err.message });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Extracted: ${extracted.length}`);
  console.log(`  ✗ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed files:`);
    failed.forEach(({ file, reason }) => {
      console.log(`  - ${file}: ${reason}`);
    });
  }
  
  return { extracted, failed };
}

// Example usage
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Usage: node scripts/safe-extract.js <branch> <file1> [file2] [file3] ...

Example:
  node scripts/safe-extract.js origin/omar-module7-forum \\
    app/forum/page.jsx \\
    app/forum/[id]/page.jsx \\
    components/ui/badge.jsx

This will extract specific files from the branch without merging everything.
  `);
  process.exit(1);
}

const branch = args[0];
const files = args.slice(1);

console.log(`🔍 Extracting from: ${branch}`);
console.log(`📁 Files to extract: ${files.length}`);

const result = extractFiles(branch, files);

if (result.extracted.length > 0) {
  console.log(`\n✅ Successfully extracted ${result.extracted.length} file(s)`);
  console.log(`\n⚠️  Next steps:`);
  console.log(`  1. Review the extracted files`);
  console.log(`  2. Test the changes: npm run dev`);
  console.log(`  3. If good, commit: git add . && git commit -m "feat: Extract [feature] from ${branch}"`);
  console.log(`  4. If not good, restore: git restore ${result.extracted.join(' ')}`);
}

