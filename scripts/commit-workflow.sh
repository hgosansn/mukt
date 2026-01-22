#!/bin/bash
set -e

echo "🧪 Running tests..."
npm run test:run

echo "🚀 Testing application..."
echo "quit" | node index.js

echo "📦 Staging changes..."
git add .

if git diff --staged --quiet; then
    echo "✅ No changes to commit"
    exit 0
fi

echo "💾 Committing changes..."
git commit -m "chore: update $(date +%Y-%m-%d\ %H:%M)"

echo "🎉 Done!"
