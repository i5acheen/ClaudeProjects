import { BookReader } from "@/components/book/BookReader";
import { TopBar } from "@/components/ui/TopBar";
import { demoJournal } from "@/lib/demo-data";
import { APP_NAME } from "@/content/marketing";

export const metadata = { title: `${APP_NAME} — demo` };

export default async function DemoBookPage({ searchParams }: { searchParams: Promise<{ memory?: string }> }) {
  const { memory } = await searchParams;
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <TopBar title={demoJournal.settings.bookTitle} basePath="/demo" active="book" demo />
      <BookReader journal={demoJournal} startMemoryId={memory} />
    </main>
  );
}
