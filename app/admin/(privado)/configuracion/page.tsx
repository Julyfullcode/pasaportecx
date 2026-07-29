import { db } from "@/lib/db";
import { alternarCatalogo, guardarCatalogo, guardarConfiguracion } from "@/app/admin/actions";
import { PurgaDatos } from "@/components/admin/PurgaDatos";

export const dynamic = "force-dynamic";

export default async function Configuracion() {
  const [config, empresas, componentes, grupos, ubicaciones] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.empresa.findMany({ orderBy: { orden: "asc" } }),
    db.componente.findMany({ orderBy: { orden: "asc" } }),
    db.grupo.findMany({ orderBy: { orden: "asc" } }),
    db.ubicacion.findMany({ orderBy: { orden: "asc" } }),
  ]);
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Todo editable, sin redespliegue</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Configuración</h1></div>
      <form action={guardarConfiguracion} className="tarjeta mt-6 grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-xl font-extrabold md:col-span-2">Evento y puntuación</h2>
        <div className="md:col-span-2"><label className="etiqueta">Nombre del evento</label><input className="campo" name="nombreEvento" defaultValue={config.nombreEvento} /></div>
        <div><label className="etiqueta">Podio individual</label><input className="campo" type="number" min={3} max={20} name="tamanoPodioIndividual" defaultValue={config.tamanoPodioIndividual} /></div>
        <div><label className="etiqueta">Podio de equipos</label><input className="campo" type="number" min={1} max={10} name="tamanoPodioEquipos" defaultValue={config.tamanoPodioEquipos} /></div>
        <div><label className="etiqueta">Método de puntaje de equipo</label><select className="campo" name="metodoPuntajeEquipo" defaultValue={config.metodoPuntajeEquipo}><option value="PROMEDIO">Promedio por integrante activo</option><option value="SUMA">Suma total</option></select></div>
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-bold"><input type="checkbox" name="asignacionAutomatica" defaultChecked={config.asignacionAutomatica} /> Asignación automática balanceada</label>
        <h2 className="mt-3 text-xl font-extrabold md:col-span-2">Pantallas de proyección</h2>
        <div><label className="etiqueta">Modo asistentes</label><select className="campo" name="modoAsistentes" defaultValue={config.modoAsistentes}><option value="MOSAICO">Mosaico</option><option value="CARRUSEL">Carrusel</option><option value="DESTACADO">Destacado</option></select></div>
        <div><label className="etiqueta">Rotación (segundos)</label><input className="campo" type="number" min={3} name="intervaloAsistentesSegundos" defaultValue={config.intervaloAsistentesSegundos} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Ciclo mixto</label><input className="campo" name="cicloMixto" defaultValue={config.cicloMixto} /><p className="mt-1 text-xs text-slate-500">Formato: asistentes:60,recuerdos:45,podio:30</p></div>
        <h2 className="mt-3 text-xl font-extrabold md:col-span-2">Recuerdos</h2>
        <div><label className="etiqueta">Puntos por recuerdo</label><input className="campo" type="number" min={0} name="puntosPorRecuerdo" defaultValue={config.puntosPorRecuerdo} /></div>
        <div><label className="etiqueta">Máximo con puntos</label><input className="campo" type="number" min={0} name="maxRecuerdosConPuntos" defaultValue={config.maxRecuerdosConPuntos} /></div>
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-bold"><input type="checkbox" name="recuerdosRequierenAprobacion" defaultChecked={config.recuerdosRequierenAprobacion} /> Los recuerdos requieren aprobación previa</label>
        <button className="boton-primario md:col-span-2">Guardar configuración</button>
      </form>
      <section className="mt-6"><h2 className="text-2xl font-extrabold">Catálogos</h2><p className="text-sm text-slate-600">Edite, reordene o agregue registros; estarán disponibles de inmediato.</p>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          <Catalogo titulo="Empresas" tipo="empresa" items={empresas} />
          <Catalogo titulo="Componentes" tipo="componente" items={componentes} color />
          <Catalogo titulo="Grupos" tipo="grupo" items={grupos} color />
          <Catalogo titulo="Ubicaciones del Día 1" tipo="ubicacion" items={ubicaciones} />
        </div>
      </section>
      <section className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 p-5"><h2 className="text-xl font-extrabold text-red-900">Purga al finalizar el evento</h2><PurgaDatos /></section>
    </div>
  );
}

function Catalogo({ titulo, tipo, items, color = false }: { titulo: string; tipo: string; items: { id: string; nombre: string; orden: number; colorHex?: string; activa?: boolean; activo?: boolean }[]; color?: boolean }) {
  return (
    <div className="tarjeta p-4"><h3 className="text-lg font-extrabold">{titulo}</h3><div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2"><form action={guardarCatalogo} className={`grid min-w-0 flex-1 gap-2 ${color ? "grid-cols-[1fr_58px_55px_auto]" : "grid-cols-[1fr_55px_auto]"}`}><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={item.id} /><input className="campo !min-h-10 !py-1 text-sm" name="nombre" defaultValue={item.nombre} />{color && <input className="campo !min-h-10 !p-1" type="color" name="colorHex" defaultValue={item.colorHex} />}<input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={item.orden} /><button className="text-xs font-extrabold text-[var(--epm-azul)]">Guardar</button></form><form action={alternarCatalogo}><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={item.id} /><button className="text-[10px] font-extrabold text-slate-500">{(item.activa ?? item.activo) === false ? "Activar" : "Desactivar"}</button></form></div>)}</div><form action={guardarCatalogo} className={`mt-4 grid gap-2 border-t pt-4 ${color ? "grid-cols-[1fr_58px_55px_auto]" : "grid-cols-[1fr_55px_auto]"}`}><input type="hidden" name="tipo" value={tipo} /><input className="campo !min-h-10 !py-1 text-sm" name="nombre" placeholder={`Nuevo en ${titulo.toLowerCase()}`} required />{color && <input className="campo !min-h-10 !p-1" type="color" name="colorHex" defaultValue="#0079C2" />}<input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={items.length + 1} /><button className="text-xs font-extrabold text-[var(--epm-azul)]">Agregar</button></form></div>
  );
}
