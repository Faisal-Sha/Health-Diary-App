from models import Family, User
from extensions import db

def seed_data():
    family = Family(family_name="TestFamily", email="test@example.com", password_hash="hashed")
    db.session.add(family)
    db.session.commit()
