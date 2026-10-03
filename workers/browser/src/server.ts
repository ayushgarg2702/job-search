import { createServer } from "node:http";
import { runSession, shutdown } from "./autofill";
import { searchNaukri, unlockNaukri } from "./naukri";
import type { SessionRequest } from "./types";

const PORT = Number(process.env.BROWSER_WORKER_PORT ?? 43125);

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => resolve(raw));
  });
}

const server = createServer((req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  void (async () => {
    if (req.method === "GET" && req.url === "/health") return send(200, { status: "ok" });

    if (req.method === "POST" && req.url === "/unlock/naukri") {
      try {
        const result = await unlockNaukri();
        return send(200, result);
      } catch (err) {
        return send(500, { ok: false, error: (err as Error).message });
      }
    }

    if (req.method === "POST" && req.url === "/search/naukri") {
      const raw = await readBody(req);
      let body: { search_term?: string; location?: string; results_wanted?: number };
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        return send(400, { error: "bad json" });
      }
      if (!body.search_term?.trim()) return send(400, { error: "search_term required" });
      const result = await searchNaukri({
        search_term: body.search_term.trim(),
        location: body.location,
        results_wanted: body.results_wanted,
      });
      return send(200, result);
    }

    if (req.method === "POST" && req.url === "/sessions") {
      const raw = await readBody(req);
      let body: SessionRequest;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(400, { error: "bad json" });
      }
      if (!body.url || !body.callbackUrl) return send(400, { error: "url and callbackUrl are required" });
      void runSession(body);
      return send(202, { accepted: true });
    }

    send(404, { error: "not found" });
  })();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Career OS browser worker on http://127.0.0.1:${PORT}. Fills forms, unlocks Naukri, never clicks Submit.`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await shutdown();
    process.exit(0);
  });
}
