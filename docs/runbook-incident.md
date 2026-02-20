# Incident Runbook

1. Check `systemctl status pulse-api pulse-worker pulse-web`.
2. Check logs with `journalctl -u <service> -n 200`.
3. Pause new scheduling if repeated failures are detected.
4. Retry failed queue jobs after root cause is fixed.
