# Career OS

Local job search for India. Find jobs → draft tailored resume & cover letter → **you approve** → helper browser fills the form → **you click Submit**.

Runs only on your machine. AI writing uses **your Cursor login** (`agent login`) — no OpenAI/Anthropic API keys.

## Quick start (you)

```bash
git clone https://github.com/ayushgarg2702/job-search.git
cd job-search
pnpm install && pnpm browser:install

curl https://cursor.com/install -fsS | bash
agent login
```

Three terminals:

```bash
pnpm dev              # http://127.0.0.1:43123
pnpm worker:jobspy    # :43124
pnpm worker:browser   # :43125
```

Then: upload resume → set target titles (e.g. Sr. SDE) → Job boards → Search now → Inbox → Approve.

**Giving this repo to Cursor?** Point the agent at [CURSOR_SETUP.md](./CURSOR_SETUP.md) — it has the full clone / install / run / Cursor-token playbook.

## What it does

- **Resume** — PDF/DOCX → editable profile  
- **Job boards** — Naukri (helper browser + unlock for captcha), LinkedIn, Indeed India, Instahyre, Greenhouse/Lever/Ashby  
- **Inbox** — fit score, drafts, filter by board; approve or decline  
- **Apply** — autofill only; you press Submit  
- **Learn** — skill gaps + real video/docs/practice links  
- **Interviews** — generated questions + timed mocks  
- **Graphs / goals / roadmap / motivation** — progress tracking  

## Notes

- Naukri captcha: **Unlock Naukri** once in Job boards, then search again.  
- LinkedIn can still block scrapers.  
- `data/` is gitignored (your DB, resume, browser profile).  

## Layout

```
apps/web/          UI
packages/          shared, engine, agents
workers/jobspy/    search scraper
workers/browser/   autofill + Naukri unlock
```
