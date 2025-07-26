# Make the script executable
# chmod +x setup-dev.sh

#!/bin/bash

set -e

echo "🔧 Setting up Health Diary Development Environment..."

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
