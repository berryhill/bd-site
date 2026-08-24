interface ResolveUpdateModDatetimeOptions {
  providedModDatetime?: string | null;
  currentModDatetime?: unknown;
  currentRevision: string;
  expectedRevision: string;
  now?: () => string;
}

export function resolveUpdateModDatetime({
  providedModDatetime,
  currentModDatetime,
  currentRevision,
  expectedRevision,
  now = () => new Date().toISOString(),
}: ResolveUpdateModDatetimeOptions): string | null | unknown {
  if (providedModDatetime !== undefined) return providedModDatetime;
  if (currentRevision !== expectedRevision) return currentModDatetime;
  return now();
}
