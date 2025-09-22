# Make the script executable
# chmod +x setup-dev.sh

#!/bin/bash

set -e

echo "🔧 Setting up Health Diary Development Environment..."

# Ensure the backend has an environment file for docker-compose.dev.yml
if [ ! -f server/.env.dev ]; then
  if [ -f server/.env.dev.example ]; then
    echo "📄 Creating server/.env.dev from template..."
    cp server/.env.dev.example server/.env.dev
  else
    echo "⚠️ server/.env.dev is missing and no template was found."
    echo "   Please create one before running the development containers."
    exit 1
  fi
fi

# Build development containers
echo "🔨 Building development containers..."
make dev-build

# Start development containers
echo "🚀 Starting development containers..."
make dev-up

# Display running containers
echo "✅ Development environment is up and running!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "To view logs, run: make dev-logs"
echo "To stop containers, run: make dev-down"
