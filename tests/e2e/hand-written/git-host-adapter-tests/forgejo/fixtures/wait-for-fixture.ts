export async function waitForFixture<TValue>(
  label: string,
  timeoutMs: number,
  read: () => Promise<TValue | undefined>,
): Promise<TValue> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const value = await read();
    if (value !== undefined) return value;
    if (Date.now() >= deadline) throw new Error(`Forgejo fixture ${label} timed out`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
