#!/bin/bash

# Database setup script for Orasan local development
# This script creates the local database and runs the schema

echo "🚀 Setting up Orasan local database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database 'orasan_dev'..."
createdb orasan_dev 2>/dev/null || echo "Database 'orasan_dev' already exists."

# Run the schema
echo "🔧 Running database schema..."
psql -d orasan_dev -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo "📊 You can now connect to 'orasan_dev' database"
else
    echo "❌ Database setup failed. Please check the error messages above."
    exit 1
fi
