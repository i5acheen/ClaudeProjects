import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JournalProvider } from "@/components/journal/JournalProvider";

export const metadata = { title: "Memory Book" };

/** Everything under /book needs a signed-in Google account. */
export default async function BookLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.email) redirect("/");
  return <JournalProvider owner={session.user.email}>{children}</JournalProvider>;
}
