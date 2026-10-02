"""Local JobSpy worker. Wraps python-jobspy behind one HTTP endpoint so the
Next.js app never has to run a scraper in its own process."""

import logging
import math
from typing import Any

from fastapi import FastAPI
from jobspy import scrape_jobs
from pydantic import BaseModel, Field

app = FastAPI(title="Career OS JobSpy worker")

SITE_MAP = {"naukri": "naukri", "indeed": "indeed", "linkedin": "linkedin", "glassdoor": "glassdoor"}


class _ErrorCollector(logging.Handler):
    """JobSpy logs board failures (captcha, 429) instead of raising them."""

    def __init__(self) -> None:
        super().__init__(level=logging.ERROR)
        self.messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.messages.append(record.getMessage())


class SearchRequest(BaseModel):
    sites: list[str] = Field(default_factory=lambda: ["naukri", "indeed"])
    search_term: str
    location: str = "India"
    results_wanted: int = 20
    hours_old: int = 72


def _clean(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _to_inr_yearly(amount: Any, interval: Any, currency: Any) -> int | None:
    amount = _clean(amount)
    if amount is None:
        return None
    if currency and str(currency).upper() not in ("INR", "RS", "₹"):
        return None
    factor = {"yearly": 1, "monthly": 12, "weekly": 52, "daily": 260, "hourly": 2080}.get(str(interval or "yearly"), 1)
    return int(float(amount) * factor)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/search")
def search(req: SearchRequest) -> dict[str, Any]:
    jobs: list[dict[str, Any]] = []
    errors: list[str] = []
    for site in req.sites:
        name = SITE_MAP.get(site)
        if not name:
            continue
        collector = _ErrorCollector()
        logging.getLogger().addHandler(collector)
        for logger_name in logging.root.manager.loggerDict:
            if logger_name.startswith("JobSpy"):
                logging.getLogger(logger_name).addHandler(collector)
        try:
            df = scrape_jobs(
                site_name=[name],
                search_term=req.search_term,
                location=req.location,
                results_wanted=req.results_wanted,
                hours_old=req.hours_old,
                country_indeed="India",
                description_format="markdown",
                verbose=0,
            )
        except Exception as exc:  # each board fails on its own; keep the rest
            errors.append(f"{site}: {exc}")
            continue
        finally:
            for logger_name in list(logging.root.manager.loggerDict):
                logging.getLogger(logger_name).removeHandler(collector)
            logging.getLogger().removeHandler(collector)

        if collector.messages and len(df) == 0:
            msg = collector.messages[-1]
            if "recaptcha" in msg.lower():
                msg = "asked for a captcha from this network. Try again later, or from your home connection."
            errors.append(f"{site}: {msg[:200]}")

        for row in df.to_dict(orient="records"):
            loc_parts = [_clean(row.get(k)) for k in ("city", "state")]
            location = ", ".join(p for p in loc_parts if p) or _clean(row.get("location")) or ""
            jobs.append(
                {
                    "source": site,
                    "externalId": str(_clean(row.get("id")) or "") or None,
                    "title": _clean(row.get("title")) or "",
                    "company": _clean(row.get("company")) or "",
                    "location": str(location),
                    "url": _clean(row.get("job_url")) or "",
                    "applyUrl": _clean(row.get("job_url_direct")),
                    "description": _clean(row.get("description")) or "",
                    "salaryMinInr": _to_inr_yearly(row.get("min_amount"), row.get("interval"), row.get("currency")),
                    "salaryMaxInr": _to_inr_yearly(row.get("max_amount"), row.get("interval"), row.get("currency")),
                    "isRemote": bool(_clean(row.get("is_remote")) or False),
                    "postedAt": str(_clean(row.get("date_posted")) or "") or None,
                }
            )
    return {"jobs": jobs, "errors": errors}
