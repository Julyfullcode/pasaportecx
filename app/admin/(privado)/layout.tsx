import { requerirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { NavegacionAdmin } from "@/components/admin/NavegacionAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requerirAdmin();
  const pendientes = await db.completitud.count({ where: { estado: "PENDIENTE" } });
  return (
    <>
      <NavegacionAdmin pendientes={pendientes} />
      <main className="min-h-screen pb-24 lg:ml-64 lg:pb-8">{children}</main>
    </>
  );
}
