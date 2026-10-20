import { Timeline } from "@/components/timeline/Timeline";
import { TopBar } from "@/components/ui/TopBar";
import { demoJournal } from "@/lib/demo-data";
import { APP_NAME } from "@/content/marketing";

export const metadata = { title: `${APP_NAME} — demo timeline` };

export default function DemoTimelinePage() {
  return (
    <main className="min-h-dvh">
      <TopBar title={demoJournal.settings.bookTitle} basePath="/demo" active="timeline" demo />
      <Timeline journal={demoJournal} basePath="/demo" />
    </main>
  );
}
