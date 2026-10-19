import { BookScreen } from "@/components/book/BookScreen";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ memory?: string }> }) {
  const { memory } = await searchParams;
  return <BookScreen startMemoryId={memory} />;
}
