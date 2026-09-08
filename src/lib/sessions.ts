export type SessionRequest = {
  id: string; title: string; status: string; kind: string; origin: string;
  createdAt: string; startedAt: string | null; finishedAt: string | null;
  result: string | null; error: string | null; hermesTaskId: string | null;
};
export type SessionEvent = {
  id: string; title: string; kind: string; level: string;
  detail: string | null; createdAt: string; meta?: unknown;
};

export function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function bridgeDuration(request: Pick<SessionRequest, "startedAt" | "finishedAt">): number | null {
  const start = timestamp(request.startedAt);
  const finish = timestamp(request.finishedAt);
  return start !== null && finish !== null && finish >= start ? finish - start : null;
}

export function linkedEvents(events: SessionEvent[], requestId: string): SessionEvent[] {
  return events.filter(({ meta }) => meta !== null && typeof meta === "object" &&
    !Array.isArray(meta) && "requestId" in meta && meta.requestId === requestId)
    .sort((a, b) => (timestamp(a.createdAt) ?? 0) - (timestamp(b.createdAt) ?? 0));
}

// Each bar represents a UTC calendar day with loaded records, not an inferred run series.
export function requestDays(requests: SessionRequest[]) {
  const counts = new Map<string, number>();
  for (const request of requests) {
    const time = timestamp(request.createdAt);
    if (time === null) continue;
    const day = new Date(time).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
}
