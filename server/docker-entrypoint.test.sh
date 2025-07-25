#!/bin/sh
set -e

echo "🚀 Starting Test Environment Setup..."

# Python-based Postgres readiness check
python << EOF
import os
import time
import psycopg2

host = os.getenv("DB_HOST", "db-test")
dbname = os.getenv("POSTGRES_DB", "health_app_test")
user = os.getenv("POSTGRES_USER", "username")
password = os.getenv("POSTGRES_PASSWORD", "password")

for i in range(30):
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host
        )
        conn.close()
        print("✅ Database is ready!")
        break
    except Exception as e:
        print(f"⏳ Waiting for database... ({i+1}/30)")
        time.sleep(2)
else:
    print("❌ Database not ready after 60 seconds. Exiting.")
    exit(1)
EOF

# Apply migrations
echo "📜 Running migrations..."
flask db upgrade

# Run tests with coverage
echo "🧪 Running tests..."
pytest "$@"

echo "✅ Tests completed successfully!"
