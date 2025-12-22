# Safe Git Merge Workflow Script (PowerShell)
# This script helps you safely merge your local changes with GitHub

Write-Host "🚀 Safe Git Merge Workflow" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Git repository not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Initializing git repository..."
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
    Write-Host ""
    $repoUrl = Read-Host "Enter your GitHub repository URL"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
    }
    Write-Host ""
}

# Step 1: Check current status
Write-Host "📊 Step 1: Checking current status..." -ForegroundColor Cyan
git status
Write-Host ""

# Step 2: Create backup branch
Write-Host "💾 Step 2: Creating backup branch..." -ForegroundColor Cyan
$backupBranch = "backup-local-changes-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
try {
    git checkout -b $backupBranch 2>$null
} catch {
    git checkout $backupBranch
}
git add .
$commitResult = git commit -m "Backup: Local changes before merge - $(Get-Date)" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Gray
} else {
    Write-Host "✅ Backup branch created: $backupBranch" -ForegroundColor Green
}
Write-Host ""

# Step 3: Create feature branch
Write-Host "🌿 Step 3: Creating feature branch for your changes..." -ForegroundColor Cyan
$featureBranch = "feature/local-changes-$(Get-Date -Format 'yyyyMMdd')"
try {
    git checkout -b $featureBranch 2>$null
} catch {
    git checkout $featureBranch
}
Write-Host "✅ Feature branch: $featureBranch" -ForegroundColor Green
Write-Host ""

# Step 4: Commit current changes
Write-Host "📝 Step 4: Committing your changes..." -ForegroundColor Cyan
git add .
$commitMsg = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Add learning recommendations, download functionality, and schema compatibility"
}
$commitResult = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Gray
} else {
    Write-Host "✅ Changes committed" -ForegroundColor Green
}
Write-Host ""

# Step 5: Fetch from origin
Write-Host "⬇️  Step 5: Fetching latest from GitHub..." -ForegroundColor Cyan
try {
    git fetch origin
    Write-Host "✅ Fetched from origin" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not fetch from origin. Make sure remote is configured." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Check what branch to merge from
Write-Host "🔍 Step 6: Checking remote branches..." -ForegroundColor Cyan
git branch -r | Select-Object -First 5
Write-Host ""
$mergeBranch = Read-Host "Enter branch to merge from (default: origin/main)"
if ([string]::IsNullOrWhiteSpace($mergeBranch)) {
    $mergeBranch = "origin/main"
}

# Step 7: Merge
Write-Host "🔄 Step 7: Merging $mergeBranch into your feature branch..." -ForegroundColor Cyan
Write-Host "⚠️  This may create conflicts that need manual resolution."
$confirm = Read-Host "Continue? (y/n)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    try {
        git merge $mergeBranch
        Write-Host "✅ Merge completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "⚠️  Merge conflicts detected!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To resolve conflicts:" -ForegroundColor Cyan
        Write-Host "1. Open conflicted files (marked with <<<<<<< HEAD)"
        Write-Host "2. Resolve conflicts manually"
        Write-Host "3. Stage resolved files: git add <file>"
        Write-Host "4. Complete merge: git commit"
        Write-Host ""
        Write-Host "Or abort merge: git merge --abort"
        exit 1
    }
} else {
    Write-Host "❌ Merge cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "✅ Workflow completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test your application thoroughly"
Write-Host "2. Push your branch: git push origin $featureBranch"
Write-Host "3. Create a Pull Request on GitHub"
Write-Host ""

