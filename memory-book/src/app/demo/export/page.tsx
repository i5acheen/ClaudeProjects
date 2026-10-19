import { ExportBook } from "@/components/export/ExportBook";
import { TopBar } from "@/components/ui/TopBar";
import { demoJournal } from "@/lib/demo-data";

export const metadata = { title: "Memory Book — demo PDF" };

export default function DemoExportPage() {
  return (
    <main className="min-h-dvh">
      <div className="no-print">
        <TopBar title={demoJournal.settings.bookTitle} basePath="/demo" demo />
      </div>
      <ExportBook journal={demoJournal} />
    </main>
  );
}
