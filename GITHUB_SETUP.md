# GitHub Repository Setup

## Step 1: Create Repository on GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `b-safe-app` (or your preferred name)
   - **Description**: "B-SAFE - Barangay Secure And Fast Engagement platform"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Connect and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using GitHub CLI (if installed)

```bash
gh repo create b-safe-app --public --source=. --remote=origin --push
```

## Step 3: Verify

After pushing, refresh your GitHub repository page - you should see all your files!

