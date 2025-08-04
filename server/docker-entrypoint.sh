#!/bin/sh

echo "📦 Running database migrations..."
flask db upgrade

# Optional: Seed initial data if needed
# Uncomment the lines below if you want to insert dummy data
# echo "🌱 Seeding initial data..."
# python seed_data.py

echo "🚀 Starting app..."
exec "$@"

# run this command in the terminal to make the docker-entrypoint.sh file executable
# cd server && chmod +x docker-entrypoint.sh

