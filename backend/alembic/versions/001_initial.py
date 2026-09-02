"""initial BillFlow schema

Revision ID: 001_initial
Revises:
Create Date: 2026-09-02
"""
from alembic import op
from app.database import Base
from app import models

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade(): Base.metadata.create_all(op.get_bind())
def downgrade(): Base.metadata.drop_all(op.get_bind())
