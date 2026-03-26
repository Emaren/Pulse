from __future__ import annotations

import logging
import time

from .automation import maybe_run_cadence_automation
from .db import SessionLocal, init_db
from .dispatcher import process_due_jobs
from .settings import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("pulse-worker")


def run() -> None:
    init_db()
    logger.info("Worker started (poll=%ss, batch=%s)", settings.worker_poll_seconds, settings.worker_batch_size)

    while True:
        with SessionLocal() as session:
            processed = process_due_jobs(
                session=session,
                batch_size=settings.worker_batch_size,
                max_attempts=settings.worker_max_attempts,
            )

        automation_result = maybe_run_cadence_automation()
        if automation_result and automation_result.get("queued_count", 0):
            logger.info(
                "Cadence automation queued %s draft(s) and skipped %s",
                automation_result.get("queued_count", 0),
                automation_result.get("skipped_count", 0),
            )

        if processed:
            logger.info("Processed %s queue item(s)", processed)
            time.sleep(1)
        else:
            time.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    run()
