#!/usr/bin/env python3
"""
Banking API Server Runner
Simple script to start the banking API server with proper configuration
"""

import os
import sys
from app import create_app

def main():
    """Main function to run the banking API server"""
    print("🏦 Starting Banking API Server...")
    print("=" * 50)
    
    # Check if dependencies are installed
    try:
        import flask
        import flask_sqlalchemy
        import flask_jwt_extended
        import flask_bcrypt
        import flask_cors
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r requirements.txt")
        sys.exit(1)
    
    # Create and configure the app
    app = create_app()
    
    # Get configuration from environment or use defaults
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🌐 Server starting on http://{host}:{port}")
    print(f"📚 API Documentation: http://localhost:{port}/api/docs")
    print(f"🔍 Health Check: http://localhost:{port}/api/health")
    print(f"🧪 Test with: python api_examples.py")
    
    if debug:
        print("⚠️  Running in DEBUG mode")
    
    print("\n📋 Default Admin Account:")
    print("   Username: admin")
    print("   Password: Admin123!")
    print("   Email: admin@bank.com")
    
    print("\n🚀 Server is ready! Press Ctrl+C to stop")
    print("=" * 50)
    
    try:
        app.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()