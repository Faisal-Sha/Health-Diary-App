from app import create_app
from extensions import db
from models import User, Family, HealthEntry

def init_db():
    """Initialize the database and create tables"""
    app = create_app()
    with app.app_context():
        print("🔧 Initializing database...")
        
        # Create all database tables
        db.create_all()
        print("✅ Database tables created")
        
        # You can add initial data here if needed
        # Example:
        # if not User.query.first():
        #     admin = User(email='admin@example.com', password='hashed_password')
        #     db.session.add(admin)
        #     db.session.commit()
        #     print("👤 Added admin user")
        
        print("✨ Database initialization complete!")

if __name__ == '__main__':
    init_db()
