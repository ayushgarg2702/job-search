import { cursorStatus } from "@career-os/agents";
import { PageHeader } from "@/components/page-header";
import { ping } from "@/lib/health";
import { getSettings } from "@/lib/store";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = getSettings();
  const cursor = cursorStatus();
  const [jobspy, browser] = await Promise.all([ping(settings.jobspyUrl), ping(settings.browserWorkerUrl)]);

  return (
    <>
      <PageHeader title="Settings" lead="How drafts get written and where the local helpers run." />
      <SettingsForm settings={settings} cursor={cursor} workers={{ jobspy, browser }} />
    </>
  );
}
