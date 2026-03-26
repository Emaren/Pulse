import logging

from fastapi import FastAPI

from .db import SessionLocal, init_db
from .routers import accounts, automation, drafts, destinations, events, health, projects, queue, signals, templates
from .services.catalog import seed_catalog
from .settings import settings

app = FastAPI(title=settings.app_name)
logger = logging.getLogger("pulse-api")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with SessionLocal() as db:
        try:
            seeded = seed_catalog(db)
            db.commit()
            if any(seeded.values()):
                logger.info("Seeded Pulse catalog: %s", seeded)
        except Exception:
            db.rollback()
            logger.exception("Pulse catalog bootstrap failed")


app.include_router(health.router)
app.include_router(projects.router)
app.include_router(destinations.router)
app.include_router(drafts.router)
app.include_router(automation.router)
app.include_router(templates.router)
app.include_router(accounts.router)
app.include_router(queue.router)
app.include_router(events.router)
app.include_router(signals.router)
