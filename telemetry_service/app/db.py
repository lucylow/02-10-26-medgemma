# telemetry_service/app/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from .config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)
AsyncSessionLocal = sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession, autoflush=False
)


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session


async def init_models():
    from . import models

    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
