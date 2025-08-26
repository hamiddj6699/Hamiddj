from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import jwt_required
from config import Config
from models import db, bcrypt, User, Account
from auth import jwt, register_user, login_user, refresh_token, logout_user, get_current_user
from banking_api import banking_bp
import os

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(banking_bp)
    
    # Authentication routes
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """User registration endpoint"""
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        result, status_code = register_user(data)
        return jsonify(result), status_code

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """User login endpoint"""
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        result, status_code = login_user(data)
        return jsonify(result), status_code

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        """Token refresh endpoint"""
        result, status_code = refresh_token()
        return jsonify(result), status_code

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        """User logout endpoint"""
        result, status_code = logout_user()
        return jsonify(result), status_code

    @app.route('/api/auth/profile', methods=['GET'])
    @jwt_required()
    def get_profile():
        """Get current user profile"""
        try:
            current_user = get_current_user()
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404

            return jsonify({
                'success': True,
                'message': 'Profile retrieved successfully',
                'data': current_user.to_dict()
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'Failed to retrieve profile',
                'error': str(e)
            }), 500

    @app.route('/api/auth/profile', methods=['PUT'])
    @jwt_required()
    def update_profile():
        """Update current user profile"""
        try:
            current_user = get_current_user()
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404

            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400

            # Update allowed fields
            allowed_fields = ['full_name', 'phone_number']
            for field in allowed_fields:
                if field in data:
                    setattr(current_user, field, data[field])

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'data': current_user.to_dict()
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Failed to update profile',
                'error': str(e)
            }), 500

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """API health check"""
        return jsonify({
            'success': True,
            'message': 'Banking API is running',
            'version': '1.0.0'
        }), 200

    # API documentation endpoint
    @app.route('/api/docs', methods=['GET'])
    def api_docs():
        """API documentation"""
        docs = {
            'success': True,
            'message': 'Banking API Documentation',
            'endpoints': {
                'Authentication': {
                    'POST /api/auth/register': 'Register new user',
                    'POST /api/auth/login': 'Login user',
                    'POST /api/auth/refresh': 'Refresh access token',
                    'POST /api/auth/logout': 'Logout user',
                    'GET /api/auth/profile': 'Get user profile',
                    'PUT /api/auth/profile': 'Update user profile'
                },
                'Banking': {
                    'POST /api/banking/accounts': 'Create new account',
                    'GET /api/banking/accounts': 'Get user accounts',
                    'GET /api/banking/accounts/<account_number>/balance': 'Get account balance',
                    'POST /api/banking/deposit': 'Deposit money',
                    'POST /api/banking/withdraw': 'Withdraw money',
                    'POST /api/banking/transfer': 'Transfer money between accounts',
                    'GET /api/banking/transactions': 'Get transaction history',
                    'GET /api/banking/transactions/<transaction_id>': 'Get transaction details'
                },
                'Utility': {
                    'GET /api/health': 'Health check',
                    'GET /api/docs': 'API documentation'
                }
            },
            'authentication': {
                'type': 'JWT Bearer Token',
                'header': 'Authorization: Bearer <access_token>',
                'note': 'Most endpoints require authentication except register, login, health, and docs'
            }
        }
        return jsonify(docs), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Endpoint not found',
            'error': 'not_found'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'message': 'Method not allowed',
            'error': 'method_not_allowed'
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': 'internal_server_error'
        }), 500

    # Create database tables
    with app.app_context():
        db.create_all()
        
        # Create a default user for testing (optional)
        if not User.query.filter_by(username='admin').first():
            admin_user = User(
                username='admin',
                email='admin@bank.com',
                full_name='Bank Administrator',
                national_id='1234567890'
            )
            admin_user.set_password('Admin123!')
            
            db.session.add(admin_user)
            
            # Create a default account for admin
            admin_account = Account(
                account_type='checking',
                currency='USD',
                user_id=admin_user.id
            )
            admin_account.account_number = admin_account.generate_account_number()
            admin_account.balance = 10000.00  # Starting balance
            
            db.session.add(admin_account)
            db.session.commit()
            
            print(f"Created admin user with account: {admin_account.account_number}")

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print("🏦 Banking API Server Starting...")
    print(f"📊 Server running on http://localhost:{port}")
    print("📚 API Documentation: http://localhost:5000/api/docs")
    print("🔍 Health Check: http://localhost:5000/api/health")
    
    app.run(host='0.0.0.0', port=port, debug=debug)