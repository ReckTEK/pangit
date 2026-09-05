const MAX_RECORDED_CHARACTERS = 1_000_000;

/** Keep reviewable startup and final diagnostics; full verbose logs remain local. */
export function recordedServerLog(log: string): string {
  log = log.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "");
  if (log.length <= MAX_RECORDED_CHARACTERS) return log;
  const head = log.slice(0, 100_000);
  const tail = log.slice(-900_000);
  return head.slice(0, head.lastIndexOf("\n") + 1) +
    "\n[PanGit: middle of verbose server log omitted; complete local log is server.full.log]\n\n" +
    tail.slice(tail.indexOf("\n") + 1);
}
