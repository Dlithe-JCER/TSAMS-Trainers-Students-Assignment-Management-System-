#!/bin/bash
# Quick setup script for backend

echo "🚀 Trainer Management Backend Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Navigate to backend directory
cd backend

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your MongoDB connection string."
    echo "   Edit: backend/.env"
else
    echo "✅ .env file already exists."
fi

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your MongoDB connection string"
echo "2. Run 'npm run dev' to start the backend server"
echo "3. In another terminal, run 'npm run dev' in the frontend directory"
echo ""
echo "Default backend URL: http://localhost:5000"
echo "Make sure VITE_API_URL in frontend matches this URL"
