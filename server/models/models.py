from extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID

class Family(db.Model):
    __tablename__ = 'families'

    id = db.Column(db.Integer, primary_key=True)
    family_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # One-to-many: Family -> Users
    users = db.relationship('User', backref='family', lazy=True)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255))  # nullable as seen in data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    timezone = db.Column(db.String(50), default='UTC')
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    avatar = db.Column(db.String(10))
    color = db.Column(db.String(20))
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    last_active = db.Column(db.DateTime)
    display_name = db.Column(db.String(100))

    # One-to-many: User -> RawEntries
    raw_entries = db.relationship('RawEntry', backref='user', lazy=True)


class RawEntry(db.Model):
    __tablename__ = 'raw_entries'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    entry_text = db.Column(db.Text)
    entry_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    

    # One-to-one: RawEntry -> HealthMetric
    health_metric = db.relationship('HealthMetric', uselist=False, backref='raw_entry')


class HealthMetric(db.Model):
    __tablename__ = 'health_metrics'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    raw_entry_id = db.Column(db.Integer, db.ForeignKey('raw_entries.id'), unique=True, nullable=False)
    entry_date = db.Column(db.Date)
    entry_time = db.Column(db.Time)
    mood_score = db.Column(db.Integer)
    energy_level = db.Column(db.Integer)
    pain_level = db.Column(db.Integer)
    sleep_quality = db.Column(db.Integer)
    stress_level = db.Column(db.Integer)
    sleep_hours = db.Column(db.Numeric(3, 1))
    bedtime = db.Column(db.Time)
    wake_time = db.Column(db.Time)
    ai_confidence = db.Column(db.Float)
    processing_version = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
