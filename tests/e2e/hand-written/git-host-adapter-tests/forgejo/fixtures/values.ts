export function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Forgejo fixture ${label} is missing`);
  }
  return value;
}

export function uniquePrefix(): string {
  return `pge2e-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function encodeBase64(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function positiveIdString(value: unknown, label: string): string {
  if (
    (typeof value !== "number" && typeof value !== "bigint") || value <= 0 ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new Error(`Forgejo fixture ${label} is missing`);
  }
  return String(value);
}
