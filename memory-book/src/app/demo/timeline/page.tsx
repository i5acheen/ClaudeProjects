import { Timeline } from "@/components/timeline/Timeline";
import { TopBar } from "@/components/ui/TopBar";
import { demoJournal } from "@/lib/demo-data";

export const metadata = { title: "Memory Book — demo timeline" };

export default function DemoTimelinePage() {
  return (
    <main className="min-h-dvh">
      <TopBar title={demoJournal.settings.bookTitle} basePath="/demo" active="timeline" demo />
      <Timeline journal={demoJournal} basePath="/demo" />
    </main>
  );
}
