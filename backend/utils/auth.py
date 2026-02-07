import os
import jwt
from functools import wraps
from flask import request, jsonify
from .dev_auth import DEV_AUTH_ENABLED, verify_token as verify_dev_token

SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing bearer token"}), 401
        token = auth_header.replace('Bearer ', '')

        try:
            if DEV_AUTH_ENABLED:
                verify_dev_token(token)
            else:
                if not SUPABASE_JWT_SECRET:
                    return jsonify({"error": "SUPABASE_JWT_SECRET not configured"}), 500
                jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=['HS256'], options={"verify_aud": False})
        except Exception as e:
            return jsonify({"error": "Invalid token", "details": str(e)}), 401

        return fn(*args, **kwargs)
    return wrapper
