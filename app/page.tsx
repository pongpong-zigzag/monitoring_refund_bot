"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefundState } from "@/types/refund";

const POLL_MS = 6000;

async function request<T>(init?: RequestInit) {
  const res = await fetch("/api/refunds", {
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Unable to reach refund service");
  }
  return (await res.json()) as T;
}

export default function Home() {
  const [state, setState] = useState<RefundState | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await request<RefundState>();
      setState(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setClientError(message);
    }
  }, []);

  const runCycle = useCallback(
    async (skipIfBusy = false) => {
      if (skipIfBusy && (pending || state?.running)) {
    return;
  }
      try {
        setPending(true);
        const data = await request<RefundState>({ method: "POST" });
        setState(data);
        setClientError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setClientError(message);
      } finally {
        setPending(false);
      }
    },
    [pending, state?.running]
  );

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!autoMode) return;
    runCycle(true);
    const id = setInterval(() => runCycle(true), POLL_MS);
    return () => clearInterval(id);
  }, [autoMode, runCycle]);

  const statusLabel = useMemo(() => {
    if (!state) return "Loading secure status…";
    if (!state.configReady) return "Awaiting secure credentials";
    return state.running ? "Refund cycle running" : "Standing by";
  }, [state]);

  const stats = useMemo(
    () => [
      {
        label: "Processed ticks",
        value: state?.processedTicks ?? 0,
      },
      {
        label: "Refunds sent",
        value: state?.refundsSent ?? 0,
      },
      {
        label: "Last tick synced",
        value: state?.lastProcessedTick ?? 0,
      },
    ],
    [state]
  );

  const primaryActionLabel = pending
    ? "Processing…"
    : state?.running
    ? "In progress"
    : "Run refund cycle";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 px-8 py-10 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-wide text-white/70">
                Qubic refund control
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">
                Run the refund bot without exposing your seed on the client.
              </h1>
              <p className="max-w-2xl text-base text-white/80">
                A hardened backend service keeps track of incoming CFB and QXMR
                transfers. Trigger a cycle on demand or enable auto mode to
                mirror swaps in real time.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => runCycle(true)}
                disabled={pending || state?.running === true}
                className="rounded-2xl bg-white/90 px-6 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-white"
              >
                {primaryActionLabel}
              </button>
              <button
                onClick={() => setAutoMode((prev) => !prev)}
                className={`rounded-2xl border px-6 py-3 text-base font-semibold transition ${
                  autoMode
                    ? "border-white/70 bg-white/20 text-white"
                    : "border-white/50 bg-transparent text-white/80"
                }`}
              >
                Auto mode {autoMode ? "enabled" : "disabled"}
              </button>
              <p className="text-center text-sm text-white/70">
                {statusLabel}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {stats.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <p className="text-sm uppercase tracking-wide text-white/50">
                {card.label}
              </p>
              <p className="mt-3 text-4xl font-semibold text-white">
                {card.value}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monitoring status</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  state?.running
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-slate-500/20 text-slate-200"
                }`}
              >
                {state?.running ? "active" : "idle"}
              </span>
            </div>
            <dl className="mt-6 space-y-4 text-sm text-white/80">
              <div className="flex justify-between">
                <dt>Last run</dt>
                <dd>{state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString() : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Backend ready</dt>
                <dd>{state?.configReady ? "Yes" : "Configure env vars"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Last error</dt>
                <dd>{state?.lastError ?? "None"}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">
              Secure backend workflow
            </h2>
            <p className="mt-3 text-sm text-white/80">
              All sensitive operations now execute inside an API route. Provide
              your Qubic account ID, seed, and asset issuers via{" "}
              <code className="rounded bg-black/40 px-2 py-1 text-xs">
                .env.local
              </code>{" "}
              so the credentials never touch the browser.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              <li>• Set QUBIC_ACCOUNT_ID and QUBIC_ACCOUNT_SEED</li>
              <li>• Optionally override issuer IDs & refund rate</li>
              <li>• Deploy to Vercel or keep local with the same API</li>
            </ul>
            {clientError && (
              <p className="mt-5 rounded-2xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                {clientError}
              </p>
            )}
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-inner">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Latest activity</h2>
            <span className="text-sm text-white/60">
              {state?.history.length ?? 0} entries
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {state?.history.length ? (
              state.history.map((item) => (
                <div
                  key={item.txId}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">
                      {item.assetReceived}
                      {item.assetSent ? ` → ${item.assetSent}` : ""}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "sent"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : item.status === "failed"
                          ? "bg-rose-500/20 text-rose-200"
                          : "bg-slate-500/20 text-slate-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-white/70">
                    Tick {item.tick} · Sender {item.senderId.slice(0, 12)}…
                  </p>
                  <p className="mt-1 text-white/60">
                    Received {item.amountReceived} · Sent{" "}
                    {item.amountSent ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {new Date(item.executedAt).toLocaleString()}
                  </p>
                  {item.note && (
                    <p className="mt-2 text-xs text-white/60">{item.note}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-white/60">
                Run a refund cycle to populate history.
              </p>
            )}
          </div>
        </section>
    </div>
    </main>
  );
}
