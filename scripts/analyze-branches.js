#!/usr/bin/env node
/**
 * Branch Analysis Script
 * Compares branches against main to identify:
 * - New files
 * - Modified files
 * - Features that might be missing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branches = [
  'origin/Elganzory',
  'origin/Elganzory2',
  'origin/feature/sprint1-knan',
  'origin/omar-branch',
  'origin/omar-branch2',
  'origin/omar-module7-forum',
  'origin/test-main'
];

const baseBranch = 'origin/main';

function getChangedFiles(branch) {
  try {
    const output = execSync(`git diff --name-status ${baseBranch}..${branch}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (err) {
    console.error(`Error comparing ${branch}:`, err.message);
    return [];
  }
}

function getNewFiles(branch) {
  try {
    const output = execSync(`git diff --name-only --diff-filter=A ${baseBranch}..${branch}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (err) {
    return [];
  }
}

function getModifiedFiles(branch) {
  try {
    const output = execSync(`git diff --name-only --diff-filter=M ${baseBranch}..${branch}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (err) {
    return [];
  }
}

function getDeletedFiles(branch) {
  try {
    const output = execSync(`git diff --name-only --diff-filter=D ${baseBranch}..${branch}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (err) {
    return [];
  }
}

function analyzeBranch(branch) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${branch}`);
  console.log('='.repeat(60));
  
  const newFiles = getNewFiles(branch);
  const modifiedFiles = getModifiedFiles(branch);
  const deletedFiles = getDeletedFiles(branch);
  
  console.log(`\n📁 New Files (${newFiles.length}):`);
  if (newFiles.length > 0) {
    newFiles.forEach(file => console.log(`  + ${file}`));
  } else {
    console.log('  (none)');
  }
  
  console.log(`\n✏️  Modified Files (${modifiedFiles.length}):`);
  if (modifiedFiles.length > 0) {
    // Group by directory
    const byDir = {};
    modifiedFiles.forEach(file => {
      const dir = path.dirname(file);
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(path.basename(file));
    });
    
    Object.keys(byDir).sort().forEach(dir => {
      console.log(`  ${dir}/`);
      byDir[dir].forEach(file => console.log(`    - ${file}`));
    });
  } else {
    console.log('  (none)');
  }
  
  console.log(`\n🗑️  Deleted Files (${deletedFiles.length}):`);
  if (deletedFiles.length > 0) {
    deletedFiles.forEach(file => console.log(`  - ${file}`));
  } else {
    console.log('  (none)');
  }
  
  return {
    branch,
    newFiles,
    modifiedFiles,
    deletedFiles,
    totalChanges: newFiles.length + modifiedFiles.length + deletedFiles.length
  };
}

function generateReport(results) {
  const report = {
    generatedAt: new Date().toISOString(),
    baseBranch,
    branches: results.map(r => ({
      branch: r.branch,
      newFiles: r.newFiles.length,
      modifiedFiles: r.modifiedFiles.length,
      deletedFiles: r.deletedFiles.length,
      totalChanges: r.totalChanges,
      newFileList: r.newFiles,
      modifiedFileList: r.modifiedFiles,
      deletedFileList: r.deletedFiles
    }))
  };
  
  fs.writeFileSync(
    'BRANCH_ANALYSIS.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n\n📊 Summary:');
  console.log('='.repeat(60));
  results.forEach(r => {
    console.log(`${r.branch.padEnd(35)} ${r.totalChanges.toString().padStart(4)} changes`);
  });
  
  console.log('\n✅ Full report saved to: BRANCH_ANALYSIS.json');
}

// Main execution
console.log('🔍 Branch Analysis Tool');
console.log(`Comparing branches against: ${baseBranch}\n`);

const results = branches.map(analyzeBranch);
generateReport(results);

