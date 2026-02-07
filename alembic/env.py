import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from backend.config import Config
from backend.models.shared import db
from backend.models.asset import Asset
from backend.models.sensor import SensorData
from backend.models.inspection import InspectionRecord
from backend.models.risk import RiskAssessment
from backend.models.asset_graph import AssetNode, AssetEdge
from backend.models.project import Project
from backend.models.action import ActionItem

config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = db.metadata


def get_url():
    return Config.SQLALCHEMY_DATABASE_URI


def run_migrations_offline():
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
