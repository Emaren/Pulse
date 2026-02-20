from __future__ import annotations

import logging
import time

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

        if processed:
            logger.info("Processed %s queue item(s)", processed)
            time.sleep(1)
        else:
            time.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    run()
