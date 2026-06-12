import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    // Redirect to login if user is not authenticated
    // Note: for this MVP demo, we assume a /login route exists or we just let it redirect
    redirect("/login");
  }

  return <>{children}</>;
}
