from fastapi import FastAPI

from .db import init_db
from .routers import accounts, drafts, destinations, events, health, projects, queue, templates
from .settings import settings

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(health.router)
app.include_router(projects.router)
app.include_router(destinations.router)
app.include_router(drafts.router)
app.include_router(templates.router)
app.include_router(accounts.router)
app.include_router(queue.router)
app.include_router(events.router)
