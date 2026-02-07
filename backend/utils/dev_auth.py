import os
import jwt
from dotenv import load_dotenv

# Ensure .env is loaded when running standalone
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
from datetime import datetime, timedelta

DEV_AUTH_ENABLED = os.getenv('DEV_AUTH_ENABLED', 'false').lower() == 'true'
DEV_AUTH_USER = os.getenv('DEV_AUTH_USER', 'admin')
DEV_AUTH_PASS = os.getenv('DEV_AUTH_PASS', 'admin')
DEV_AUTH_SECRET = os.getenv('DEV_AUTH_SECRET', 'dev-secret')


def issue_token(username):
    payload = {
        'sub': username,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=7),
        'aud': 'dev'
    }
    return jwt.encode(payload, DEV_AUTH_SECRET, algorithm='HS256')


def verify_token(token):
    return jwt.decode(token, DEV_AUTH_SECRET, algorithms=['HS256'], options={"verify_aud": False})
