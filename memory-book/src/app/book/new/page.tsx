import { redirect } from "next/navigation";

/** Writing now happens on the Write page. */
export default function NewMemoryPage() {
  redirect("/book/write");
}
