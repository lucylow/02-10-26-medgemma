"""create initial tables (cases, jobs, audits) — Postgres.

Revision ID: 0001
Revises:
Create Date: 2026-02-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("case_id", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_cases_case_id"), "cases", ["case_id"], unique=True)

    op.execute("CREATE TYPE job_status AS ENUM ('PENDING','RUNNING','DONE','FAILED')")
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("case_id", sa.String(length=128), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "RUNNING", "DONE", "FAILED", name="job_status", create_type=False), server_default="PENDING"),
        sa.Column("rq_id", sa.String(length=128)),
        sa.Column("payload", sa.JSON()),
        sa.Column("result", sa.JSON()),
        sa.Column("error_text", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_jobs_case_id", "jobs", ["case_id"])
    op.create_index("idx_jobs_status", "jobs", ["status"])

    op.create_table(
        "audits",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.String(length=64), nullable=False),
        sa.Column("event", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_audits_job_id", "audits", ["job_id"])


def downgrade():
    op.drop_table("audits")
    op.drop_index("idx_jobs_status", table_name="jobs")
    op.drop_index("idx_jobs_case_id", table_name="jobs")
    op.drop_table("jobs")
    op.execute("DROP TYPE job_status")
    op.drop_index(op.f("ix_cases_case_id"), table_name="cases")
    op.drop_table("cases")
