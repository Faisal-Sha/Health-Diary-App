# seed_data.py
from app import create_app
from extensions import db
from models import User, Family

app = create_app()
with app.app_context():
    if not Family.query.first():
        print("🌱 Seeding demo family and user...")
        family = Family(family_name="Test Family", email="test@example.com", password_hash="hashed")
        db.session.add(family)
        db.session.commit()

        user = User(username="testuser", family_id=family.id)
        db.session.add(user)
        db.session.commit()
        print("✅ Seed data inserted.")
