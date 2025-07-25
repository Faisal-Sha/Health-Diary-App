from flask import Flask, jsonify
import os
from datetime import datetime
from dotenv import load_dotenv
from datetime import datetime, timedelta
from extensions import db, migrate, jwt, cors
from config import DevelopmentConfig, ProductionConfig, TestingConfig

# Load environment variables only for non-testing environments
if os.getenv("FLASK_ENV") != "testing":
    from dotenv import load_dotenv
    load_dotenv()


def create_app(config_class=None):
    app = Flask(__name__)
    # app.config.from_object(os.getenv('FLASK_ENV', 'development'))
    app.config.from_object(config_class or os.getenv("FLASK_CONFIG") or DevelopmentConfig)

    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
    app.config['JWT_ALGORITHM'] = 'HS256'

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"❌ Invalid token error: {error}")
        return jsonify({'error': 'Invalid token'}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"❌ Missing token error: {error}")
        return jsonify({'error': 'Authorization token is required'}), 401

    from models import User, Family, HealthMetric, RawEntry

    # Register blueprints
    from routes.auth_routes import register_auth_routes
    from routes.family_routes import register_family_routes
    from routes.entry_routes import register_entry_routes
    from routes.analytics_routes import register_analytics_routes
    
    register_auth_routes(app)
    register_family_routes(app)
    register_entry_routes(app)
    register_analytics_routes(app)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        })

    return app

app = create_app()
if __name__ == '__main__':
    print("\n🚀 Starting Health Diary App...")
    print("🔍 Checking configuration...")
    print("🤖 OpenAI API configured:", "✅" if os.getenv('OPENAI_API_KEY') else "❌")
    print("🔐 JWT Secret configured:", "✅" if os.getenv('JWT_SECRET_KEY') else "⚠️  Using default (change for production)")
    
    app.run(debug=True, host='0.0.0.0', port=5000)