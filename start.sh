#!/bin/bash

echo "🏦 Banking Application with JWT Authentication"
echo "=============================================="

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    sudo systemctl start mongod 2>/dev/null || {
        echo "❌ Failed to start MongoDB. Please start it manually:"
        echo "   sudo systemctl start mongod"
        echo "   or"
        echo "   mongod"
        exit 1
    }
    sleep 2
fi

echo "✅ MongoDB is running"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running in production"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting Banking API server..."
echo "📊 Environment: ${NODE_ENV:-development}"
echo "🔗 Server will be available at: http://localhost:3000"
echo "📚 API Documentation: Check README.md for detailed API usage"
echo "🧪 To run tests: npm test"
echo "🌱 To seed database: npm run seed"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the application
npm run dev