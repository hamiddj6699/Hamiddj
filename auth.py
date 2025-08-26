from functools import wraps
from flask import jsonify, request, current_app
from flask_jwt_extended import (
    JWTManager, jwt_required, create_access_token, create_refresh_token,
    get_jwt_identity, get_jwt, verify_jwt_in_request
)
from models import User, db
import re

jwt = JWTManager()

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'success': False,
        'message': 'Token has expired',
        'error': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'success': False,
        'message': 'Invalid token',
        'error': 'invalid_token'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'success': False,
        'message': 'Access token is required',
        'error': 'authorization_required'
    }), 401

# Token blacklist (in production, use Redis or database)
blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return jwt_payload['jti'] in blacklisted_tokens

# Validation functions
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def validate_national_id(national_id):
    """Validate national ID format (simple validation)"""
    return len(national_id) >= 8 and national_id.isdigit()

# Authentication functions
def register_user(data):
    """Register a new user"""
    try:
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'full_name', 'national_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return {
                    'success': False,
                    'message': f'{field} is required'
                }, 400

        # Validate email format
        if not validate_email(data['email']):
            return {
                'success': False,
                'message': 'Invalid email format'
            }, 400

        # Validate password strength
        is_valid, message = validate_password(data['password'])
        if not is_valid:
            return {
                'success': False,
                'message': message
            }, 400

        # Validate national ID
        if not validate_national_id(data['national_id']):
            return {
                'success': False,
                'message': 'Invalid national ID format'
            }, 400

        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return {
                'success': False,
                'message': 'Username already exists'
            }, 400

        if User.query.filter_by(email=data['email']).first():
            return {
                'success': False,
                'message': 'Email already registered'
            }, 400

        if User.query.filter_by(national_id=data['national_id']).first():
            return {
                'success': False,
                'message': 'National ID already registered'
            }, 400

        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            full_name=data['full_name'],
            phone_number=data.get('phone_number'),
            national_id=data['national_id']
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()

        # Create access and refresh tokens
        access_token = create_access_token(identity=user.public_id)
        refresh_token = create_refresh_token(identity=user.public_id)

        return {
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': 'Registration failed',
            'error': str(e)
        }, 500

def login_user(data):
    """Login user and return JWT tokens"""
    try:
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return {
                'success': False,
                'message': 'Username and password are required'
            }, 400

        # Find user by username or email
        user = User.query.filter(
            (User.username == data['username']) | 
            (User.email == data['username'])
        ).first()

        if not user or not user.check_password(data['password']):
            return {
                'success': False,
                'message': 'Invalid credentials'
            }, 401

        if not user.is_active:
            return {
                'success': False,
                'message': 'Account is deactivated'
            }, 401

        # Create tokens
        access_token = create_access_token(identity=user.public_id)
        refresh_token = create_refresh_token(identity=user.public_id)

        return {
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            }
        }, 200

    except Exception as e:
        return {
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }, 500

def refresh_token():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.filter_by(public_id=current_user_id).first()

        if not user or not user.is_active:
            return {
                'success': False,
                'message': 'User not found or inactive'
            }, 404

        new_access_token = create_access_token(identity=current_user_id)

        return {
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': new_access_token
            }
        }, 200

    except Exception as e:
        return {
            'success': False,
            'message': 'Token refresh failed',
            'error': str(e)
        }, 500

def logout_user():
    """Logout user by blacklisting the token"""
    try:
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        return {
            'success': True,
            'message': 'Successfully logged out'
        }, 200

    except Exception as e:
        return {
            'success': False,
            'message': 'Logout failed',
            'error': str(e)
        }, 500

def get_current_user():
    """Get current authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.filter_by(public_id=current_user_id).first()
        
        if not user:
            return None
            
        return user
        
    except Exception:
        return None

# Decorator for role-based access control
def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user = get_current_user()
        if not current_user or not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        return f(*args, **kwargs)
    return decorated_function