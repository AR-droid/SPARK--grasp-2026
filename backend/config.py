import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Use a default placeholder if not set, user needs to populate .env
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:password@db.supabase.co:5432/postgres')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
