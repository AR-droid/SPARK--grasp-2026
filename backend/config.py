import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
root_env = os.path.join(basedir, '..', '.env')
load_dotenv(root_env)

class Config:
    # Use a default placeholder if not set, user needs to populate .env
    # Use local sqlite for development if DATABASE_URL is not set
    basedir = os.path.abspath(os.path.dirname(__file__))
    # Go up one level from 'backend' to root, then into 'instance'
    db_path = os.path.join(basedir, '..', 'instance', 'spark.db')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///' + db_path)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
