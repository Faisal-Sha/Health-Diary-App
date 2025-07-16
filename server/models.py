from extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Family(db.Model):
    __tablename__ = 'families'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with users
    users = db.relationship('User', backref='family', lazy=True)


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    role = db.Column(db.String(20), default='member')  # 'admin' or 'member'
    family_id = db.Column(UUID(as_uuid=True), db.ForeignKey('families.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FamilyMember(db.Model):
    __tablename__ = 'family_members'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = db.Column(UUID(as_uuid=True), db.ForeignKey('families.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    health_entries = db.relationship('HealthEntry', backref='member', lazy=True)

class HealthEntry(db.Model):
    __tablename__ = 'health_entries'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = db.Column(UUID(as_uuid=True), db.ForeignKey('family_members.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    entry_type = db.Column(db.String(50), nullable=False)  # e.g., 'blood_pressure', 'glucose', 'general'
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add any additional fields specific to your health entries
    systolic = db.Column(db.Integer)
    diastolic = db.Column(db.Integer)
    glucose_level = db.Column(db.Float)
    weight = db.Column(db.Float)
    height = db.Column(db.Float)
    temperature = db.Column(db.Float)
