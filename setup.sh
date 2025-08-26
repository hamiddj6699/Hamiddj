#!/bin/bash

echo "🏦 Banking API Setup Script"
echo "=========================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install system dependencies
install_system_deps() {
    echo "📦 Installing system dependencies..."
    
    if command_exists apt; then
        echo "Using apt package manager..."
        sudo apt update
        sudo apt install -y python3-full python3-venv python3-pip
    elif command_exists yum; then
        echo "Using yum package manager..."
        sudo yum install -y python3 python3-venv python3-pip
    elif command_exists brew; then
        echo "Using brew package manager..."
        brew install python3
    else
        echo "⚠️  Could not detect package manager. Please install Python 3.8+ manually."
        return 1
    fi
}

# Function to create virtual environment and install dependencies
setup_venv() {
    echo "🐍 Setting up Python virtual environment..."
    
    # Remove existing virtual environment if it exists
    if [ -d "banking_env" ]; then
        echo "Removing existing virtual environment..."
        rm -rf banking_env
    fi
    
    # Create virtual environment
    python3 -m venv banking_env
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment."
        echo "Try installing python3-venv: sudo apt install python3-venv"
        return 1
    fi
    
    # Activate virtual environment
    source banking_env/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    echo "📚 Installing Python dependencies..."
    pip install -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully!"
    else
        echo "❌ Failed to install dependencies."
        return 1
    fi
}

# Function to run without virtual environment (using --break-system-packages)
setup_direct() {
    echo "⚠️  Installing directly to system (not recommended for production)"
    pip install --break-system-packages -r requirements.txt
}

# Main setup process
echo "Choose installation method:"
echo "1. Virtual environment (recommended)"
echo "2. Direct system installation (requires --break-system-packages)"
echo "3. Skip dependency installation"

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        if ! command_exists python3; then
            echo "Python 3 not found. Attempting to install system dependencies..."
            install_system_deps
        fi
        setup_venv
        ;;
    2)
        setup_direct
        ;;
    3)
        echo "Skipping dependency installation..."
        ;;
    *)
        echo "Invalid choice. Using virtual environment..."
        setup_venv
        ;;
esac

# Create activation script
echo "📝 Creating activation script..."
cat > activate_banking.sh << 'EOF'
#!/bin/bash
echo "🏦 Activating Banking API Environment"
if [ -d "banking_env" ]; then
    source banking_env/bin/activate
    echo "✅ Virtual environment activated"
    echo "Run: python app.py or python run.py to start the server"
else
    echo "⚠️  Virtual environment not found. Run ./setup.sh first"
fi
EOF

chmod +x activate_banking.sh

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Activate environment: source activate_banking.sh"
echo "2. Start server: python app.py or python run.py"
echo "3. Test API: python api_examples.py"
echo ""
echo "🔗 Useful URLs (when server is running):"
echo "   • API Documentation: http://localhost:5000/api/docs"
echo "   • Health Check: http://localhost:5000/api/health"
echo ""
echo "🔐 Default admin account:"
echo "   • Username: admin"
echo "   • Password: Admin123!"