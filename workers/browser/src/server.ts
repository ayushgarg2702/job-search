import { createServer } from "node:http";
import { runSession, shutdown } from "./autofill";
import type { SessionRequest } from "./types";

const PORT = Number(process.env.BROWSER_WORKER_PORT ?? 43125);

const server = createServer((req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "GET" && req.url === "/health") return send(200, { status: "ok" });

  if (req.method === "POST" && req.url === "/sessions") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let body: SessionRequest;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(400, { error: "bad json" });
      }
      if (!body.url || !body.callbackUrl) return send(400, { error: "url and callbackUrl are required" });
      void runSession(body);
      send(202, { accepted: true });
    });
    return;
  }

  send(404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Career OS browser worker on http://127.0.0.1:${PORT}. It fills forms and never clicks Submit.`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await shutdown();
    process.exit(0);
  });
}
