import os
from datetime import timedelta

class Config:
    """Base configuration (default for all environments)."""
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    JWT_ALGORITHM = 'HS256'
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    TESTING = False
    DEBUG = False


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://username:password@db/health_app')


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://username:password@db/health_app')


class TestingConfig(Config):
    """Testing configuration (for pytest)."""
    TESTING = True
    DEBUG = True
    JWT_SECRET_KEY = 'test-secret'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://username:password@db-test/health_app_test')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

