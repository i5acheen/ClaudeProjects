import { ExportBook } from "@/components/export/ExportBook";
import { TopBar } from "@/components/ui/TopBar";
import { demoJournal } from "@/lib/demo-data";
import { APP_NAME } from "@/content/marketing";

export const metadata = { title: `${APP_NAME} — demo PDF` };

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
