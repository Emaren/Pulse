"""add destinations and post drafts

Revision ID: 0002_destinations_and_post_drafts
Revises: 0001_init_placeholder
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_destinations_and_post_drafts"
down_revision = "0001_init_placeholder"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "destinations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("external_ref", sa.String(length=255), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("cadence_mode", sa.String(length=32), nullable=False),
        sa.Column("daily_post_target", sa.Integer(), nullable=False),
        sa.Column("windows_json", sa.Text(), nullable=False),
        sa.Column("requires_approval", sa.Boolean(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "platform", "name", name="uq_destinations_project_platform_name"),
    )
    op.create_index(op.f("ix_destinations_platform"), "destinations", ["platform"], unique=False)
    op.create_index(op.f("ix_destinations_project_id"), "destinations", ["project_id"], unique=False)

    op.create_table(
        "post_drafts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("destination_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("source_ref", sa.String(length=255), nullable=True),
        sa.Column("notes_json", sa.Text(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("queued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_queue_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_post_drafts_destination_id"), "post_drafts", ["destination_id"], unique=False)
    op.create_index(op.f("ix_post_drafts_project_id"), "post_drafts", ["project_id"], unique=False)
    op.create_index(op.f("ix_post_drafts_status"), "post_drafts", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_post_drafts_status"), table_name="post_drafts")
    op.drop_index(op.f("ix_post_drafts_project_id"), table_name="post_drafts")
    op.drop_index(op.f("ix_post_drafts_destination_id"), table_name="post_drafts")
    op.drop_table("post_drafts")
    op.drop_index(op.f("ix_destinations_project_id"), table_name="destinations")
    op.drop_index(op.f("ix_destinations_platform"), table_name="destinations")
    op.drop_table("destinations")
