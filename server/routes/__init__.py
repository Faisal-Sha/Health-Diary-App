# routes/__init__.py

from .auth_routes import register_auth_routes
from .family_routes import register_family_routes
from .entry_routes import entry_bp
from .analytics_routes import analytics_bp

__all__ = [
    "register_auth_routes",
    "register_family_routes",
    "entry_bp",
    "analytics_bp"
]
