import { db } from "@/lib/db";
import { actualizarLogoEmpresa, alternarCatalogo, guardarCatalogo, guardarConfiguracion } from "@/app/admin/actions";
import { PrepararPublico } from "@/components/admin/PrepararPublico";
import { AgendaConfig } from "@/components/admin/AgendaConfig";
import { InputImagenOptimizada } from "@/components/admin/InputImagenOptimizada";
import { EstadoAlmacenamiento } from "@/components/admin/EstadoAlmacenamiento";
import { obtenerReporteAlmacenamiento } from "@/lib/almacenamiento";

export const dynamic = "force-dynamic";

export default async function Configuracion() {
  const [config, empresas, componentes, ubicaciones, diasAgenda, reporteAlmacenamiento, resumenDatos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.empresa.findMany({ orderBy: { orden: "asc" } }),
    db.componente.findMany({ orderBy: { orden: "asc" } }),
    db.ubicacion.findMany({ orderBy: { orden: "asc" } }),
    db.diaAgenda.findMany({ orderBy: { orden: "asc" }, include: { fotos: { orderBy: { orden: "asc" } }, momentos: { orderBy: [{ horaInicio: "asc" }, { nombre: "asc" }] } } }).catch(() => []),
    obtenerReporteAlmacenamiento(),
    Promise.all([
      db.participante.aggregate({ _count: { id: true }, _sum: { puntosTotales: true } }),
      db.completitud.count(),
      db.recuerdo.count(),
    ]).then(([participantes, completitudes, recuerdos]) => ({
      participantes: participantes._count.id,
      puntos: participantes._sum.puntosTotales ?? 0,
      completitudes,
      recuerdos,
    })),
  ]);
  return (
    <div className="p-4 md:p-7">
      <div><p className="font-extrabold text-[var(--epm-verde-medio)]">Todo editable, sin redespliegue</p><h1 className="text-3xl font-extrabold text-[var(--epm-azul-profundo)]">Configuración</h1></div>
      <form action={guardarConfiguracion} className="tarjeta mt-6 grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-xl font-extrabold md:col-span-2">Evento y puntuación</h2>
        <div><label className="etiqueta">Nombre del evento</label><input className="campo" name="nombreEvento" defaultValue={config.nombreEvento} maxLength={140} required /></div>
        <div><label className="etiqueta">Descripción para la agenda</label><textarea className="campo min-h-24 resize-y" name="descripcionAgenda" defaultValue={config.descripcionAgenda} maxLength={800} placeholder="Una invitación breve que acompañará el nombre del evento" /></div>
        <div className="md:col-span-2"><label className="etiqueta">Organizadores</label><input className="campo" name="organizadoresAgenda" defaultValue={config.organizadoresAgenda} maxLength={300} placeholder="Ejemplo: Vicepresidencia Experiencia Usuario-Cliente" /><p className="mt-1 text-xs text-slate-500">Este texto aparecerá en el pie de todas las páginas de la agenda.</p></div>
        <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-950">
          <input type="checkbox" name="diplomaHabilitado" defaultChecked={config.diplomaHabilitado} className="mt-1" />
          <span><strong className="block">Habilitar certificado para los participantes</strong><small className="mt-1 block font-medium text-amber-800">Actívalo únicamente al finalizar el encuentro. Mientras esté desactivado, el certificado no podrá abrirse.</small></span>
        </label>
        <div><label className="etiqueta">Podio individual</label><input className="campo" type="number" min={3} max={20} name="tamanoPodioIndividual" defaultValue={config.tamanoPodioIndividual} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Puntos por registrarse</label><input className="campo" type="number" min={0} max={10000} name="puntosPorRegistro" defaultValue={config.puntosPorRegistro} required /><p className="mt-1 text-xs text-slate-500">Se otorgan una sola vez al crear el pasaporte. Los cambios aplicarán únicamente a participantes nuevos.</p></div>
        <h2 className="mt-3 text-xl font-extrabold md:col-span-2">Pantallas de proyección</h2>
        <div><label className="etiqueta">Modo asistentes</label><select className="campo" name="modoAsistentes" defaultValue={config.modoAsistentes}><option value="MOSAICO">Mosaico</option><option value="CARRUSEL">Carrusel</option><option value="DESTACADO">Destacado</option></select></div>
        <div><label className="etiqueta">Rotación (segundos)</label><input className="campo" type="number" min={3} name="intervaloAsistentesSegundos" defaultValue={config.intervaloAsistentesSegundos} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Ciclo mixto</label><input className="campo" name="cicloMixto" defaultValue={config.cicloMixto} /><p className="mt-1 text-xs text-slate-500">Formato: asistentes:60,recuerdos:45,podio:30</p></div>
        <h2 className="mt-3 text-xl font-extrabold md:col-span-2">Recuerdos</h2>
        <div><label className="etiqueta">Puntos por recuerdo</label><input className="campo" type="number" min={0} name="puntosPorRecuerdo" defaultValue={config.puntosPorRecuerdo} /></div>
        <div><label className="etiqueta">Cantidad máxima de recuerdos que otorgan puntos</label><input className="campo" type="number" min={0} name="maxRecuerdosConPuntos" defaultValue={config.maxRecuerdosConPuntos} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Máximo de recuerdos por participante</label><input className="campo" type="number" min={1} max={50} name="maxRecuerdosPorParticipante" defaultValue={config.maxRecuerdosPorParticipante} /><p className="mt-1 text-xs text-slate-500">Recomendado para el plan gratuito: 10 por persona.</p></div>
        <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <label className="etiqueta">Puntos para la foto con más reacciones</label>
          <input className="campo bg-white" type="number" min={0} max={100000} name="puntosFotoMasReaccionada" defaultValue={config.puntosFotoMasReaccionada} />
          <p className="mt-2 text-xs text-rose-800">Suma corazones y risas. El premio se asigna en tiempo real a una sola foto visible; si cambia la ganadora, los puntos se trasladan a su creador. En empate gana la publicada primero. Usa 0 para desactivarlo.</p>
        </div>
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-bold"><input type="checkbox" name="recuerdosRequierenAprobacion" defaultChecked={config.recuerdosRequierenAprobacion} /> Los recuerdos requieren aprobación previa</label>
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900"><input type="checkbox" name="eliminarEvidenciasRechazadas" defaultChecked={config.eliminarEvidenciasRechazadas} /> Eliminar del almacenamiento las evidencias rechazadas</label>
        <button className="boton-primario md:col-span-2">Guardar configuración</button>
      </form>
      <EstadoAlmacenamiento reporte={reporteAlmacenamiento} />
      <AgendaConfig dias={diasAgenda} />
      <section className="mt-6"><h2 className="text-2xl font-extrabold">Catálogos</h2><p className="text-sm text-slate-600">Edite, reordene o agregue registros; estarán disponibles de inmediato.</p>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          <CatalogoEmpresas items={empresas} />
          <Catalogo titulo="Componentes" tipo="componente" items={componentes} color />
          <Catalogo titulo="Ubicaciones del Día 1" tipo="ubicacion" items={ubicaciones} />
        </div>
      </section>
      <section className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
        <h2 className="text-xl font-extrabold text-red-900">Preparar aplicación para público real</h2>
        <p className="mt-1 text-sm text-red-800">Puedes usarla al terminar cada ciclo de pruebas. Antes de abrir el registro al público, ejecútala una última vez.</p>
        <PrepararPublico resumen={resumenDatos} />
      </section>
    </div>
  );
}

function CatalogoEmpresas({ items }: { items: { id: string; nombre: string; orden: number; urlLogo: string | null; activa: boolean }[] }) {
  return (
    <div className="tarjeta p-4">
      <h3 className="text-lg font-extrabold">Empresas</h3>
      <p className="mt-1 text-xs text-slate-500">El logo aparecerá junto a cada persona en las pantallas de proyección. PNG transparente recomendado.</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <form action={guardarCatalogo} className="grid min-w-0 flex-1 grid-cols-[1fr_55px_auto] gap-2">
                <input type="hidden" name="tipo" value="empresa" />
                <input type="hidden" name="id" value={item.id} />
                <input className="campo !min-h-10 !py-1 text-sm" name="nombre" defaultValue={item.nombre} />
                <input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={item.orden} />
                <button className="text-xs font-extrabold text-[var(--epm-azul)]">Guardar</button>
              </form>
              <form action={alternarCatalogo}>
                <input type="hidden" name="tipo" value="empresa" />
                <input type="hidden" name="id" value={item.id} />
                <button className="text-[10px] font-extrabold text-slate-500">{item.activa ? "Desactivar" : "Activar"}</button>
              </form>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
              <div className="grid h-14 w-28 place-items-center overflow-hidden rounded-lg bg-slate-50 p-2">
                {item.urlLogo ? <img src={item.urlLogo} alt={`Logo ${item.nombre}`} className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] font-bold text-slate-400">Sin logo</span>}
              </div>
              <form action={actualizarLogoEmpresa} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={item.id} />
                <InputImagenOptimizada name="logo" maximo={700} calidad={0.8} maxBytes={250_000} required className="min-w-[220px] flex-1" />
                <button className="boton-secundario !min-h-9 !px-3 text-xs">{item.urlLogo ? "Reemplazar logo" : "Cargar logo"}</button>
              </form>
              {item.urlLogo && <form action={actualizarLogoEmpresa}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="accion" value="quitar" /><button className="text-xs font-extrabold text-red-700">Quitar</button></form>}
            </div>
          </div>
        ))}
      </div>
      <form action={guardarCatalogo} className="mt-4 grid grid-cols-[1fr_55px_auto] gap-2 border-t pt-4">
        <input type="hidden" name="tipo" value="empresa" />
        <input className="campo !min-h-10 !py-1 text-sm" name="nombre" placeholder="Nueva empresa" required />
        <input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={items.length + 1} />
        <button className="text-xs font-extrabold text-[var(--epm-azul)]">Agregar</button>
      </form>
    </div>
  );
}

function Catalogo({ titulo, tipo, items, color = false }: { titulo: string; tipo: string; items: { id: string; nombre: string; orden: number; colorHex?: string; activa?: boolean; activo?: boolean }[]; color?: boolean }) {
  return (
    <div className="tarjeta p-4"><h3 className="text-lg font-extrabold">{titulo}</h3><div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2"><form action={guardarCatalogo} className={`grid min-w-0 flex-1 gap-2 ${color ? "grid-cols-[1fr_58px_55px_auto]" : "grid-cols-[1fr_55px_auto]"}`}><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={item.id} /><input className="campo !min-h-10 !py-1 text-sm" name="nombre" defaultValue={item.nombre} />{color && <input className="campo !min-h-10 !p-1" type="color" name="colorHex" defaultValue={item.colorHex} />}<input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={item.orden} /><button className="text-xs font-extrabold text-[var(--epm-azul)]">Guardar</button></form><form action={alternarCatalogo}><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={item.id} /><button className="text-[10px] font-extrabold text-slate-500">{(item.activa ?? item.activo) === false ? "Activar" : "Desactivar"}</button></form></div>)}</div><form action={guardarCatalogo} className={`mt-4 grid gap-2 border-t pt-4 ${color ? "grid-cols-[1fr_58px_55px_auto]" : "grid-cols-[1fr_55px_auto]"}`}><input type="hidden" name="tipo" value={tipo} /><input className="campo !min-h-10 !py-1 text-sm" name="nombre" placeholder={`Nuevo en ${titulo.toLowerCase()}`} required />{color && <input className="campo !min-h-10 !p-1" type="color" name="colorHex" defaultValue="#0079C2" />}<input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={items.length + 1} /><button className="text-xs font-extrabold text-[var(--epm-azul)]">Agregar</button></form></div>
  );
}
