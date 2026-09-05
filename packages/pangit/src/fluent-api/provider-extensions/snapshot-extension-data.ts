/** Own extension data and freeze its records/arrays without freezing caller-owned values. */
export function snapshotExtensionData<T extends object>(value: T): Readonly<T> {
  const snapshot = structuredClone(value);
  const visited = new WeakSet<object>();
  const freeze = (entry: unknown): void => {
    if (entry === null || typeof entry !== "object" || visited.has(entry)) return;
    // Non-record values retain their structured-clone semantics (for example, binary buffers).
    if (!Array.isArray(entry) && Object.getPrototypeOf(entry) !== Object.prototype) return;
    visited.add(entry);
    for (const child of Object.values(entry)) freeze(child);
    Object.freeze(entry);
  };
  freeze(snapshot);
  return snapshot;
}
