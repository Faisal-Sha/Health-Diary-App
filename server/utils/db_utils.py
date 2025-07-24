# utils/db_utils.py
import psycopg2
from psycopg2.extras import RealDictCursor
import os

DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Database connection error: {e}")
        return None
