import { db } from "@/lib/db";

export function consultarEquiposProyeccion() {
  return db.equipo.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      orden: true,
      participantes: {
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          urlFoto: true,
          empresa: { select: { nombre: true } },
        },
      },
    },
  });
}