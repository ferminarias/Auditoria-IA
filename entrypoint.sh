#!/bin/bash
echo "🔧 Fixing /app/cache permissions"
mkdir -p /app/cache/hub
chmod -R 777 /app/cache
echo "🚀 Starting API"
exec uvicorn main:app --host 0.0.0.0 --port 8000
