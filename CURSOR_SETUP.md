# Career OS — run this repo in Cursor (local)

This guide is for **you** and for **Cursor Agent**.  
Goal: clone this repo, run it on your machine, and use **your Cursor account** for AI drafts / interviews. No OpenAI/Anthropic API keys required.

---

## What this app is

Local job-search OS for India:

1. Upload resume  
2. Search jobs (Naukri, LinkedIn, Indeed, Instahyre, company ATS pages)  
3. Score + draft resume / cover letter / answers  
4. You approve → helper browser autofills the form  
5. **You click Submit** (never auto-submitted)

All data stays in `data/` on your machine.

---

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 22+ | Next.js app |
| pnpm | 10+ | workspace installs |
| Python | 3.10+ | JobSpy worker |
| Cursor | Desktop + CLI | drafts, learn plan, interview coaching |

Optional but recommended: Chromium via Playwright (installed by the setup commands below).

---

## For humans: one-time setup

```bash
# 1. Clone
git clone https://github.com/ayushgarg2702/job-search.git
cd job-search

# 2. Install JS deps + browser for autofill
pnpm install
pnpm browser:install

# 3. Cursor CLI (uses YOUR Cursor login — this is the “token”)
curl https://cursor.com/install -fsS | bash
agent login
# Complete login in the browser. Confirm:
agent status
```

JobSpy creates its own Python venv on first `pnpm worker:jobspy` — no manual pip needed.

---

## For humans: run locally (3 terminals)

```bash
# Terminal A — UI
pnpm dev
# → http://127.0.0.1:43123

# Terminal B — job search (Indeed / LinkedIn / JobSpy)
pnpm worker:jobspy
# → http://127.0.0.1:43124

# Terminal C — autofill + Naukri unlock browser
pnpm worker:browser
# → http://127.0.0.1:43125
```

Then in the app:

1. **Resume** — upload PDF/DOCX, set **Job titles you want** (e.g. `Sr. SDE`)  
2. **Job boards** — confirm boards (LinkedIn is on by default). For Naukri captcha: **Unlock Naukri** once → solve captcha → **Search now**  
3. **Inbox** — review drafts → **Approve & fill form** → you press Submit in the helper browser  

---

## For Cursor Agent: clone + run playbook

When a user pastes this repo URL into Cursor and asks you to run it:

### 1. Clone into workspace

```bash
git clone https://github.com/ayushgarg2702/job-search.git
cd job-search
```

(Or open the folder if already cloned.)

### 2. Install

```bash
pnpm install
pnpm browser:install
```

### 3. Cursor auth (user’s account)

Drafts / Learn generate / Interview questions use the **Cursor Agent CLI**, not a third-party API key.

```bash
# If missing:
curl https://cursor.com/install -fsS | bash

agent status
# If not logged in, ask the user to run in their terminal:
#   agent login
```

Do **not** ask for OpenAI keys. If CLI is offline, the app still runs with template/offline drafts.

### 4. Start all three processes

Prefer three background terminals:

```bash
pnpm dev
pnpm worker:jobspy
pnpm worker:browser
```

Verify:

```bash
curl -s http://127.0.0.1:43123/api/status
curl -s http://127.0.0.1:43124/health
curl -s http://127.0.0.1:43125/health
```

Open **http://127.0.0.1:43123** for the user.

### 5. First-run checklist for the user

- [ ] Upload resume on **Resume**  
- [ ] Set target titles (required for search)  
- [ ] **Job boards** → Unlock Naukri if needed → **Search now**  
- [ ] Approve from **Inbox**; user clicks Submit themselves  

---

## How “Cursor tokens” are used

| Feature | Needs `agent login`? | Fallback if offline |
|---------|----------------------|---------------------|
| Tailored drafts | Yes (best quality) | Offline pack from resume |
| Learn / roadmap generate | Yes | Curated links + gap list |
| Interview questions + coaching | Yes | Small offline question bank + rubric |
| Job search / scoring / autofill | No | Always local |

Your Cursor subscription covers the agent CLI. Nothing is billed through this repo’s servers — there are none.

---

## Ports

| Port | Process |
|------|---------|
| 43123 | Next.js UI |
| 43124 | JobSpy worker |
| 43125 | Playwright browser worker |

---

## Naukri captcha

1. Start `pnpm worker:browser`  
2. Job boards → **Unlock Naukri**  
3. Solve captcha / log in in the Chromium window  
4. **Search now** — Naukri scrape reuses that browser profile (`data/browser-profile/`)  

Usually once or twice per machine.

---

## Safety rules (do not change)

- Never auto-click **Submit** / **Apply** / **Next** on job sites  
- Approve only autofills; the human submits  
- Do not commit `data/` (resume, DB, browser profile)  

---

## Layout

```
apps/web/          Next.js UI + API
packages/shared/   schemas, India helpers
packages/engine/   scoring, resume parse, resources, titles
packages/agents/   Cursor CLI drafts, learn, interviews
workers/jobspy/    python-jobspy HTTP wrapper
workers/browser/   Playwright autofill + Naukri unlock/search
data/              local SQLite + resume (gitignored)
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Search says JobSpy not reachable | `pnpm worker:jobspy` |
| Unlock Naukri fails | `pnpm worker:browser` |
| Drafts are “offline” | `agent login` then retry |
| Naukri 0 jobs / captcha | Unlock Naukri → solve → Search now |
| LinkedIn empty | Board may block scrapers; try later or rely on Instahyre/Indeed |
| Wrong roles (SDET/SRE) | Set specific target titles on Resume, not “software engineer” |

---

## License / origin

Local Career OS inspired by [career-ops](https://github.com/career-ops-hq/career-ops) and [JobSpy](https://github.com/speedyapply/JobSpy).  
Repo: https://github.com/ayushgarg2702/job-search
