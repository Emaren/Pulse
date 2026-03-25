"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "facebook" | "x";
type Mode = "exact" | "next_slot";

function isoInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function isoTomorrowAt(hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0, 0);
  return d.toISOString();
}

// datetime-local: "YYYY-MM-DDTHH:mm" (no TZ) -> treat as LOCAL time -> ISO (UTC)
function isoFromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, y, mo, d, h, mi] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);
  return dt.toISOString();
}

export function QueueCompose() {
  const router = useRouter();

  const [platform, setPlatform] = useState<Platform>("facebook");
  const [text, setText] = useState("");
  const [useNextSlot, setUseNextSlot] = useState(false);
  const [whenLocal, setWhenLocal] = useState(""); // datetime-local
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSend = text.trim().length > 0;
  const disabled = busy;

  async function schedule(params: { scheduledAt?: string | null; forceExact?: boolean }) {
    if (!canSend || disabled) return;

    setBusy(true);
    setMsg(null);

    try {
      const scheduledAt = params.scheduledAt ?? null;
      const mode: Mode = params.forceExact ? "exact" : useNextSlot ? "next_slot" : "exact";

      const body: Record<string, unknown> = {
        platforms: [platform],
        updates: [text.trim()],
        mode,
      };

      if (mode === "exact") {
        body.scheduled_at = scheduledAt ?? new Date().toISOString();
      } else if (scheduledAt) {
        // next_slot but anchored to a chosen base time
        body.scheduled_at = scheduledAt;
      }

      const res = await fetch("/api/queue/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        throw new Error(data?.detail ?? `Request failed (${res.status})`);
      }

      setText("");
      setWhenLocal("");
      setMsg("Queued.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h3>Compose</h3>

      <div className="grid" style={{ gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <small>Platform</small>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              style={inputStyle}
              disabled={disabled}
            >
              <option value="facebook">Facebook</option>
              <option value="x">X</option>
            </select>
          </label>

          <div style={{ display: "grid", gap: 6, minWidth: 320 }}>
            <small>When</small>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                style={primaryBtnStyle(!disabled && canSend)}
                disabled={disabled || !canSend}
                onClick={() => schedule({ scheduledAt: new Date().toISOString(), forceExact: true })}
                title="Immediate (forces exact)"
              >
                Send now
              </button>

              <button
                type="button"
                style={btnStyle(!disabled && canSend)}
                disabled={disabled || !canSend}
                onClick={() => schedule({ scheduledAt: isoInMinutes(10) })}
              >
                In 10m
              </button>

              <button
                type="button"
                style={btnStyle(!disabled && canSend)}
                disabled={disabled || !canSend}
                onClick={() => schedule({ scheduledAt: isoInMinutes(30) })}
              >
                In 30m
              </button>

              <button
                type="button"
                style={btnStyle(!disabled && canSend)}
                disabled={disabled || !canSend}
                onClick={() => schedule({ scheduledAt: isoTomorrowAt(9, 0) })}
              >
                Tomorrow 9am
              </button>
            </div>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your post..."
          rows={4}
          style={{
            width: "100%",
            padding: "12px 12px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            resize: "vertical",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
          disabled={disabled}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={useNextSlot}
              onChange={(e) => setUseNextSlot(e.target.checked)}
              disabled={disabled}
            />
            <small>Use next slot</small>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <small>Pick date/time</small>
            <input
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => setWhenLocal(e.target.value)}
              style={inputStyle}
              disabled={disabled}
            />
          </label>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            style={primaryBtnStyle(!disabled && canSend)}
            disabled={disabled || !canSend}
            onClick={() => schedule({ scheduledAt: isoFromDatetimeLocal(whenLocal) })}
            title={
              useNextSlot
                ? "Queues using next_slot (omit scheduled_at if empty)"
                : "Queues using exact (defaults to now if empty)"
            }
          >
            Queue post
          </button>

          <button
            type="button"
            style={btnStyle(!disabled)}
            disabled={disabled}
            onClick={() => router.refresh()}
          >
            Refresh
          </button>

          {msg ? <small style={{ marginLeft: 8 }}>{msg}</small> : null}
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--ink)",
};

function btnStyle(enabled: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    opacity: enabled ? 1 : 0.55,
    cursor: enabled ? "pointer" : "not-allowed",
    color: "var(--ink)",
  };
}

function primaryBtnStyle(enabled: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--accent-soft)",
    fontWeight: 600,
    opacity: enabled ? 1 : 0.55,
    cursor: enabled ? "pointer" : "not-allowed",
    color: "var(--ink)",
  };
}
