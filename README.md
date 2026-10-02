# Career OS

A local job search app for India. It finds jobs, writes a tailored resume and cover letter for each one, and waits for you to approve. When you approve, it opens the application and fills the form. You click Submit.

Everything runs on your machine. The only account it uses is your Cursor login.

## What it does

- **Resume** — upload a PDF or DOCX. The app reads it into a profile you can edit.
- **Job boards** — searches Naukri, Indeed India and LinkedIn (through JobSpy), Instahyre, and company career pages on Greenhouse, Lever and Ashby. No API keys.
- **Inbox** — each job gets a fit score. Good fits get a draft: tailored resume, cover letter, form answers. You approve or decline.
- **Apply** — on approve, a browser opens the application and fills it in. It never clicks Submit.
- **Applications** — track every job from found to offer.
- **Graphs** — where you are applying: funnel, cities, boards, companies, weekly progress.
- **Goals, targets, learn, roadmap** — what you want, how much per week, what to learn next, and a plan.
- **Interviews** — sample questions and timed mock interviews with feedback.
- **Motivation** — streaks, wins, and an "I can do it" check-in.

## How the writing works

Drafts are written by Cursor Agent (headless CLI) in four steps: drafter, critic, voice pass and a provenance check. Every number and skill in a draft must exist in your resume; anything else gets cut or flagged. A banned-phrase list keeps out the usual filler ("leverage", "passionate", "results-driven" and so on).

If the Cursor CLI is not installed, the app still works and builds drafts straight from your resume without a model.

## Setup

You need Node 22+, pnpm, and Python 3.10+ with `venv`.

```bash
pnpm install
pnpm browser:install          # Chromium for the autofill browser

# Cursor CLI (for drafts and interview feedback)
curl https://cursor.com/install -fsS | bash
agent login
```

## Run

Three processes. Run each in its own terminal:

```bash
pnpm dev                 # app on http://127.0.0.1:43123
pnpm worker:jobspy       # JobSpy search worker on :43124 (creates its venv on first run)
pnpm worker:browser      # autofill browser on :43125
```

Then open the app, upload your resume, set a goal, and press **Search now** on the Job boards page.

## Layout

```
apps/web/          Next.js app (UI + API routes)
packages/shared/   schemas, statuses, India helpers
packages/engine/   fit scoring, resume parsing, roadmap, interview bank
packages/agents/   Cursor Agent runner, draft pipeline, voice and provenance checks
workers/jobspy/    Python worker around python-jobspy
workers/browser/   Playwright worker that fills forms and stops before Submit
data/              your local database, resume and drafts (git-ignored)
```

## Notes

- Naukri and LinkedIn sometimes block scrapers or ask for a captcha. The Job boards page shows which board failed and why. Instahyre and company pages are the most reliable.
- The autofill browser keeps its own profile in `data/browser-profile`, so if you log in to Naukri or Instahyre once, it stays logged in.
- Ideas and flow are borrowed from [career-ops](https://github.com/career-ops-hq/career-ops) and [JobSpy](https://github.com/speedyapply/JobSpy).
