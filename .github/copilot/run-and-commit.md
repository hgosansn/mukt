# Run and Commit Skill

This skill runs the Mukt tool and commits changes to the repository.

## Usage

```bash
# Test the application
echo "quit" | node index.js

# Run tests to verify everything works
npm run test:run

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: describe your changes here"
```

## Full Workflow

```bash
#!/bin/bash
set -e

# 1. Run tests to ensure code quality
echo "🧪 Running tests..."
npm run test:run

# 2. Test the application initialization
echo "🚀 Testing application..."
echo "quit" | node index.js

# 3. Stage changes
echo "📦 Staging changes..."
git add .

# 4. Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
    exit 0
fi

# 5. Commit with timestamp
echo "💾 Committing changes..."
git commit -m "chore: update $(date +%Y-%m-%d\ %H:%M)"

echo "🎉 Done!"
```
