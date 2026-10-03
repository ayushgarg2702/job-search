import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

const DATA_DIR = process.env.CAREER_OS_DATA_DIR
  ? path.resolve(process.env.CAREER_OS_DATA_DIR)
  : path.resolve(process.cwd(), "../../data");
const LOG = path.join(DATA_DIR, "access.log");

/**
 * One line per page request, in the terminal and in data/access.log.
 * If a request never shows up here, it never reached the app.
 */
export default async function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "-";
  const from = req.headers.get("x-forwarded-for") ?? "direct";
  const line = `${new Date().toISOString()} ${req.method} ${req.nextUrl.pathname} host=${host} from=${from}`;
  console.log(`[career-os] ${line}`);
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(LOG, `${line}\n`);
  } catch {
    // logging must never break a request
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|api/screenshots/).*)"],
};
