import { requireUser, homePathForRole } from "@/lib/session";
import { signOut } from "@/lib/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <a href={homePathForRole(user.role)} className="font-bold">5stars</a>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm underline">Salir</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
