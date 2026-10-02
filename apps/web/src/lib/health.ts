import "server-only";

export async function ping(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
