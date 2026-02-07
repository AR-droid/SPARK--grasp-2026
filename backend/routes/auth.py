from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from ..utils.dev_auth import DEV_AUTH_ENABLED, DEV_AUTH_USER, DEV_AUTH_PASS, issue_token
from ..models.shared import db
from ..models.user import User


auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    if not DEV_AUTH_ENABLED:
        return jsonify({"error": "Dev auth disabled"}), 403

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password or len(password) < 6:
        return jsonify({"error": "Email and password (min 6 chars) required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "User already exists"}), 409

    user = User(email=email, password_hash=generate_password_hash(password, method="pbkdf2:sha256"))
    db.session.add(user)
    db.session.commit()

    token = issue_token(email)
    return jsonify({"token": token, "user": user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    if not DEV_AUTH_ENABLED:
        return jsonify({"error": "Dev auth disabled"}), 403

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if username:
        user = User.query.filter_by(email=username.lower()).first()
        if user and check_password_hash(user.password_hash, password):
            token = issue_token(user.email)
            return jsonify({"token": token, "user": user.to_dict()}), 200

    if username != DEV_AUTH_USER or password != DEV_AUTH_PASS:
        return jsonify({"error": "Invalid credentials"}), 401

    token = issue_token(username)
    return jsonify({"token": token})
