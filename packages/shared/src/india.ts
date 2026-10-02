export const INDIA_CITIES = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Kochi",
  "Jaipur",
  "Remote (India)",
] as const;

const CITY_ALIASES: [RegExp, string][] = [
  [/bengaluru|bangalore/i, "Bengaluru"],
  [/hyderabad|secunderabad/i, "Hyderabad"],
  [/pune/i, "Pune"],
  [/mumbai|bombay|navi mumbai|thane/i, "Mumbai"],
  [/delhi|gurgaon|gurugram|noida|ghaziabad|faridabad|ncr/i, "Delhi NCR"],
  [/chennai|madras/i, "Chennai"],
  [/kolkata|calcutta/i, "Kolkata"],
  [/ahmedabad|gandhinagar/i, "Ahmedabad"],
  [/kochi|cochin|trivandrum|thiruvananthapuram/i, "Kochi"],
  [/jaipur/i, "Jaipur"],
  [/remote|work from home|wfh|anywhere/i, "Remote (India)"],
  [/(^|,\s*)KA(,|\s|$)|karnataka/i, "Bengaluru"],
  [/(^|,\s*)(TG|TS)(,|\s|$)|telangana/i, "Hyderabad"],
  [/(^|,\s*)TN(,|\s|$)|tamil nadu/i, "Chennai"],
  [/(^|,\s*)(DL|HR)(,|\s|$)|haryana/i, "Delhi NCR"],
  [/(^|,\s*)WB(,|\s|$)|west bengal/i, "Kolkata"],
];

export function normalizeCity(location: string | null | undefined): string {
  if (!location) return "Unknown";
  for (const [re, city] of CITY_ALIASES) {
    if (re.test(location)) return city;
  }
  if (/india|,\s*IN$/i.test(location)) return "India (other)";
  return "Outside India";
}

export function isIndiaLocation(location: string | null | undefined): boolean {
  const city = normalizeCity(location);
  return city !== "Outside India" && city !== "Unknown";
}

/** "₹18 LPA" style. */
export function formatLpa(amountInr: number | null | undefined): string {
  if (!amountInr) return "—";
  const lpa = amountInr / 100000;
  return `₹${lpa >= 10 ? Math.round(lpa) : lpa.toFixed(1)} LPA`;
}

export const SOURCES = [
  { id: "naukri", label: "Naukri", via: "jobspy" },
  { id: "instahyre", label: "Instahyre", via: "direct" },
  { id: "indeed", label: "Indeed India", via: "jobspy" },
  { id: "linkedin", label: "LinkedIn", via: "jobspy" },
  { id: "ats", label: "Company career pages (Greenhouse, Lever, Ashby)", via: "direct" },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];
