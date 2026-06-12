import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // Fetch full user to check role
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!dbUser || dbUser.role !== 'admin') {
    // Forcibly redirect non-admins
    redirect("/editor");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 p-4 sticky top-0 z-50 backdrop-blur-xl">
        <h1 className="text-xl font-bold text-cyan-400">Lazynext Command Center</h1>
      </nav>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
}
