import "server-only";
import {
  ProfileSchema,
  SearchConfigSchema,
  SettingsSchema,
  type Profile,
  type SearchConfig,
  type Settings,
} from "@career-os/shared";
import { getKv, setKv } from "./db";

export const DEFAULT_ATS: SearchConfig["atsCompanies"] = [
  { provider: "greenhouse", slug: "groww" },
  { provider: "greenhouse", slug: "druva" },
  { provider: "greenhouse", slug: "inmobi" },
  { provider: "greenhouse", slug: "slice" },
  { provider: "lever", slug: "meesho" },
  { provider: "lever", slug: "cred" },
  { provider: "lever", slug: "fampay" },
  { provider: "ashby", slug: "atlan" },
];

export function getProfile(): Profile {
  return ProfileSchema.parse(getKv("profile", {}));
}

export function saveProfile(patch: Partial<Profile>): Profile {
  const next = ProfileSchema.parse({ ...getProfile(), ...patch });
  setKv("profile", next);
  return next;
}

export function hasResume(): boolean {
  return getProfile().resumeText.trim().length > 0;
}

export function getSettings(): Settings {
  return SettingsSchema.parse(getKv("settings", {}));
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = SettingsSchema.parse({ ...getSettings(), ...patch });
  setKv("settings", next);
  return next;
}

export function getSearchConfig(): SearchConfig {
  const stored = getKv<Partial<SearchConfig> | null>("search", null);
  return SearchConfigSchema.parse(stored ?? { atsCompanies: DEFAULT_ATS });
}

export function saveSearchConfig(patch: Partial<SearchConfig>): SearchConfig {
  const next = SearchConfigSchema.parse({ ...getSearchConfig(), ...patch });
  setKv("search", next);
  return next;
}
