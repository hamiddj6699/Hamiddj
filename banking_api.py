from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from decimal import Decimal, InvalidOperation
from datetime import datetime
from models import db, User, Account, Transaction
from auth import get_current_user
import uuid

banking_bp = Blueprint('banking', __name__, url_prefix='/api/banking')

# Account Management APIs
@banking_bp.route('/accounts', methods=['POST'])
@jwt_required()
def create_account():
    """Create a new bank account"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        data = request.get_json()
        
        # Validate account type
        valid_types = ['savings', 'checking', 'business']
        account_type = data.get('account_type', '').lower()
        
        if account_type not in valid_types:
            return jsonify({
                'success': False,
                'message': f'Invalid account type. Must be one of: {", ".join(valid_types)}'
            }), 400

        # Create new account
        account = Account(
            account_type=account_type,
            currency=data.get('currency', 'USD').upper(),
            user_id=current_user.id
        )
        
        # Generate unique account number
        account.account_number = account.generate_account_number()
        
        db.session.add(account)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'data': account.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create account',
            'error': str(e)
        }), 500

@banking_bp.route('/accounts', methods=['GET'])
@jwt_required()
def get_user_accounts():
    """Get all accounts for the current user"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        accounts = Account.query.filter_by(user_id=current_user.id).all()
        
        return jsonify({
            'success': True,
            'message': 'Accounts retrieved successfully',
            'data': [account.to_dict() for account in accounts]
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve accounts',
            'error': str(e)
        }), 500

@banking_bp.route('/accounts/<account_number>/balance', methods=['GET'])
@jwt_required()
def get_account_balance(account_number):
    """Get account balance"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        account = Account.query.filter_by(
            account_number=account_number,
            user_id=current_user.id
        ).first()

        if not account:
            return jsonify({
                'success': False,
                'message': 'Account not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Balance retrieved successfully',
            'data': {
                'account_number': account.account_number,
                'balance': float(account.balance),
                'currency': account.currency
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve balance',
            'error': str(e)
        }), 500

# Transaction APIs
@banking_bp.route('/deposit', methods=['POST'])
@jwt_required()
def deposit_money():
    """Deposit money to account"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['account_number', 'amount']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400

        # Validate amount
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (InvalidOperation, ValueError):
            return jsonify({
                'success': False,
                'message': 'Invalid amount'
            }), 400

        # Find account
        account = Account.query.filter_by(
            account_number=data['account_number'],
            user_id=current_user.id
        ).first()

        if not account:
            return jsonify({
                'success': False,
                'message': 'Account not found'
            }), 404

        if not account.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is inactive'
            }), 400

        # Create transaction record
        transaction = Transaction(
            transaction_type='deposit',
            amount=amount,
            currency=account.currency,
            description=data.get('description', 'Deposit'),
            to_account_id=account.id,
            initiated_by=current_user.id,
            status='completed',
            processed_at=datetime.utcnow()
        )

        # Update account balance
        account.balance += amount
        account.updated_at = datetime.utcnow()

        db.session.add(transaction)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Deposit successful',
            'data': {
                'transaction': transaction.to_dict(),
                'new_balance': float(account.balance)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Deposit failed',
            'error': str(e)
        }), 500

@banking_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def withdraw_money():
    """Withdraw money from account"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['account_number', 'amount']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400

        # Validate amount
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (InvalidOperation, ValueError):
            return jsonify({
                'success': False,
                'message': 'Invalid amount'
            }), 400

        # Find account
        account = Account.query.filter_by(
            account_number=data['account_number'],
            user_id=current_user.id
        ).first()

        if not account:
            return jsonify({
                'success': False,
                'message': 'Account not found'
            }), 404

        if not account.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is inactive'
            }), 400

        # Check sufficient balance
        if account.balance < amount:
            return jsonify({
                'success': False,
                'message': 'Insufficient balance'
            }), 400

        # Create transaction record
        transaction = Transaction(
            transaction_type='withdrawal',
            amount=amount,
            currency=account.currency,
            description=data.get('description', 'Withdrawal'),
            from_account_id=account.id,
            initiated_by=current_user.id,
            status='completed',
            processed_at=datetime.utcnow()
        )

        # Update account balance
        account.balance -= amount
        account.updated_at = datetime.utcnow()

        db.session.add(transaction)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Withdrawal successful',
            'data': {
                'transaction': transaction.to_dict(),
                'new_balance': float(account.balance)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Withdrawal failed',
            'error': str(e)
        }), 500

@banking_bp.route('/transfer', methods=['POST'])
@jwt_required()
def transfer_money():
    """Transfer money between accounts"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['from_account_number', 'to_account_number', 'amount']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400

        # Validate amount
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (InvalidOperation, ValueError):
            return jsonify({
                'success': False,
                'message': 'Invalid amount'
            }), 400

        # Find from account (must belong to current user)
        from_account = Account.query.filter_by(
            account_number=data['from_account_number'],
            user_id=current_user.id
        ).first()

        if not from_account:
            return jsonify({
                'success': False,
                'message': 'Source account not found'
            }), 404

        if not from_account.is_active:
            return jsonify({
                'success': False,
                'message': 'Source account is inactive'
            }), 400

        # Find to account (can belong to any user)
        to_account = Account.query.filter_by(
            account_number=data['to_account_number']
        ).first()

        if not to_account:
            return jsonify({
                'success': False,
                'message': 'Destination account not found'
            }), 404

        if not to_account.is_active:
            return jsonify({
                'success': False,
                'message': 'Destination account is inactive'
            }), 400

        # Check if trying to transfer to same account
        if from_account.id == to_account.id:
            return jsonify({
                'success': False,
                'message': 'Cannot transfer to the same account'
            }), 400

        # Check sufficient balance
        if from_account.balance < amount:
            return jsonify({
                'success': False,
                'message': 'Insufficient balance'
            }), 400

        # Check currency compatibility (simplified - in real app, handle exchange rates)
        if from_account.currency != to_account.currency:
            return jsonify({
                'success': False,
                'message': 'Currency mismatch between accounts'
            }), 400

        # Create transaction record
        transaction = Transaction(
            transaction_type='transfer',
            amount=amount,
            currency=from_account.currency,
            description=data.get('description', 'Transfer'),
            from_account_id=from_account.id,
            to_account_id=to_account.id,
            initiated_by=current_user.id,
            status='completed',
            processed_at=datetime.utcnow()
        )

        # Update account balances
        from_account.balance -= amount
        to_account.balance += amount
        from_account.updated_at = datetime.utcnow()
        to_account.updated_at = datetime.utcnow()

        db.session.add(transaction)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Transfer successful',
            'data': {
                'transaction': transaction.to_dict(),
                'from_account_balance': float(from_account.balance),
                'to_account_balance': float(to_account.balance)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Transfer failed',
            'error': str(e)
        }), 500

@banking_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transaction_history():
    """Get transaction history for user's accounts"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Get query parameters
        account_number = request.args.get('account_number')
        transaction_type = request.args.get('type')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Base query for user's transactions
        user_account_ids = [acc.id for acc in current_user.accounts]
        
        query = Transaction.query.filter(
            (Transaction.from_account_id.in_(user_account_ids)) |
            (Transaction.to_account_id.in_(user_account_ids))
        )

        # Filter by account if specified
        if account_number:
            account = Account.query.filter_by(
                account_number=account_number,
                user_id=current_user.id
            ).first()
            if account:
                query = query.filter(
                    (Transaction.from_account_id == account.id) |
                    (Transaction.to_account_id == account.id)
                )
            else:
                return jsonify({
                    'success': False,
                    'message': 'Account not found'
                }), 404

        # Filter by transaction type if specified
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)

        # Order by creation date (newest first) and paginate
        transactions = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()

        return jsonify({
            'success': True,
            'message': 'Transaction history retrieved successfully',
            'data': [transaction.to_dict() for transaction in transactions],
            'pagination': {
                'offset': offset,
                'limit': limit,
                'count': len(transactions)
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve transaction history',
            'error': str(e)
        }), 500

@banking_bp.route('/transactions/<transaction_id>', methods=['GET'])
@jwt_required()
def get_transaction_details(transaction_id):
    """Get details of a specific transaction"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Get user's account IDs
        user_account_ids = [acc.id for acc in current_user.accounts]
        
        # Find transaction that involves user's accounts
        transaction = Transaction.query.filter(
            Transaction.transaction_id == transaction_id,
            (
                (Transaction.from_account_id.in_(user_account_ids)) |
                (Transaction.to_account_id.in_(user_account_ids))
            )
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'message': 'Transaction not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Transaction details retrieved successfully',
            'data': transaction.to_dict()
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve transaction details',
            'error': str(e)
        }), 500