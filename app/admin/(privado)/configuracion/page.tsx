import { db } from "@/lib/db";
import { actualizarLogoEmpresa, alternarCatalogo, guardarCatalogo, guardarConfiguracion } from "@/app/admin/actions";
import { PrepararPublico } from "@/components/admin/PrepararPublico";
import { AgendaConfig } from "@/components/admin/AgendaConfig";
import { InputImagenOptimizada } from "@/components/admin/InputImagenOptimizada";
import { EstadoAlmacenamiento } from "@/components/admin/EstadoAlmacenamiento";
import { obtenerReporteAlmacenamiento } from "@/lib/almacenamiento";

export const dynamic = "force-dynamic";

export default async function Configuracion() {
  const [config, empresas, equipos, diasAgenda, reporteAlmacenamiento, resumenDatos] = await Promise.all([
    db.configuracionEvento.findUniqueOrThrow({ where: { id: "evento" } }),
    db.empresa.findMany({ orderBy: { orden: "asc" } }),
    db.equipo.findMany({ orderBy: { orden: "asc" } }),
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
      <form action={guardarConfiguracion} className="mt-6 space-y-4">
        <details className="group overflow-hidden rounded-3xl bg-white shadow-soft">
          <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6"><span><small className="block font-extrabold text-[var(--epm-verde)]">Datos generales</small><strong className="text-xl">Evento y puntuación</strong></span><span className="text-2xl transition group-open:rotate-45">+</span></summary>
          <div className="grid gap-4 p-5 md:grid-cols-2">
        <div><label className="etiqueta">Nombre del evento</label><input className="campo" name="nombreEvento" defaultValue={config.nombreEvento} maxLength={140} required /></div>
        <div><label className="etiqueta">Descripción para la agenda</label><textarea className="campo min-h-24 resize-y" name="descripcionAgenda" defaultValue={config.descripcionAgenda} maxLength={800} placeholder="Una invitación breve que acompañará el nombre del evento" /></div>
        <div className="md:col-span-2"><label className="etiqueta">Organizadores</label><input className="campo" name="organizadoresAgenda" defaultValue={config.organizadoresAgenda} maxLength={300} placeholder="Ejemplo: Vicepresidencia Experiencia Usuario-Cliente" /><p className="mt-1 text-xs text-slate-500">Este texto aparecerá en el pie de todas las páginas de la agenda.</p></div>
        <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-950">
          <input type="checkbox" name="diplomaHabilitado" defaultChecked={config.diplomaHabilitado} className="mt-1" />
          <span><strong className="block">Habilitar certificado para los participantes</strong><small className="mt-1 block font-medium text-amber-800">Actívalo únicamente al finalizar el encuentro. Mientras esté desactivado, el certificado no podrá abrirse.</small></span>
        </label>
        <div><label className="etiqueta">Podio individual</label><input className="campo" type="number" min={3} max={20} name="tamanoPodioIndividual" defaultValue={config.tamanoPodioIndividual} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Puntos por registrarse</label><input className="campo" type="number" min={0} max={10000} name="puntosPorRegistro" defaultValue={config.puntosPorRegistro} required /><p className="mt-1 text-xs text-slate-500">Se otorgan una sola vez al crear el pasaporte. Los cambios aplicarán únicamente a participantes nuevos.</p></div>
          </div>
        </details>
        <details className="group overflow-hidden rounded-3xl bg-white shadow-soft">
          <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6"><span><small className="block font-extrabold text-[var(--epm-verde)]">Visualización en vivo</small><strong className="text-xl">Pantallas de proyección</strong></span><span className="text-2xl transition group-open:rotate-45">+</span></summary>
          <div className="grid gap-4 p-5 md:grid-cols-2">
        <div><label className="etiqueta">Modo asistentes</label><select className="campo" name="modoAsistentes" defaultValue={config.modoAsistentes}><option value="MOSAICO">Mosaico</option><option value="CARRUSEL">Carrusel</option><option value="DESTACADO">Destacado</option></select></div>
        <div><label className="etiqueta">Rotación (segundos)</label><input className="campo" type="number" min={3} name="intervaloAsistentesSegundos" defaultValue={config.intervaloAsistentesSegundos} /></div>
        <div className="md:col-span-2"><label className="etiqueta">Ciclo mixto</label><input className="campo" name="cicloMixto" defaultValue={config.cicloMixto} /><p className="mt-1 text-xs text-slate-500">Formato: asistentes:60,recuerdos:45,podio:30. La presentación de cierre se abre únicamente desde su desafío.</p></div>
        <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 font-bold text-sky-950">
          <input type="checkbox" name="rotacionAutomaticaProyeccion" defaultChecked={config.rotacionAutomaticaProyeccion} className="mt-1" />
          <span><strong className="block">Rotación automática entre vistas</strong><small className="mt-1 block font-medium text-sky-800">Si se desactiva, la proyección mixta permanecerá en la primera vista configurada.</small></span>
        </label>
          </div>
        </details>
        <details className="group overflow-hidden rounded-3xl bg-white shadow-soft">
          <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6"><span><small className="block font-extrabold text-[var(--epm-verde)]">Fotos y reconocimientos</small><strong className="text-xl">Recuerdos</strong></span><span className="text-2xl transition group-open:rotate-45">+</span></summary>
          <div className="grid gap-4 p-5 md:grid-cols-2">
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
          </div>
        </details>
        <button className="boton-primario w-full">Guardar configuración</button>
      </form>
      <EstadoAlmacenamiento reporte={reporteAlmacenamiento} />
      <AgendaConfig dias={diasAgenda} />
      <details className="group mt-6 overflow-hidden rounded-3xl bg-white shadow-soft">
        <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6"><span><small className="block font-extrabold text-[var(--epm-verde)]">Listados editables</small><strong className="text-xl">Empresas y equipos</strong><span className="mt-1 block text-sm font-medium text-white/75">Edita, reordena o agrega registros disponibles en la aplicación.</span></span><span className="text-2xl transition group-open:rotate-45">+</span></summary>
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <CatalogoEmpresas items={empresas} />
          <CatalogoEquipos items={equipos} />
        </div>
      </details>
      <details className="group mt-6 overflow-hidden rounded-3xl bg-white shadow-soft">
        <summary className="marca-gradiente flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white md:p-6"><span><small className="block font-extrabold text-[var(--epm-verde)]">Limpieza controlada</small><strong className="text-xl">Preparar aplicación para público real</strong><span className="mt-1 block text-sm font-medium text-white/75">Elimina los datos de prueba sin borrar la configuración.</span></span><span className="text-2xl transition group-open:rotate-45">+</span></summary>
        <div className="border-2 border-t-0 border-red-200 bg-red-50 p-5"><p className="text-sm text-red-800">Puedes usarla al terminar cada ciclo de pruebas. Antes de abrir el registro al público, ejecútala una última vez.</p><PrepararPublico resumen={resumenDatos} /></div>
      </details>
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
              <div className="grid h-10 w-20 place-items-center overflow-hidden rounded-lg bg-slate-50 p-1.5">
                {item.urlLogo ? <img src={item.urlLogo} alt={`Logo ${item.nombre}`} className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] font-bold text-slate-400">Sin logo</span>}
              </div>
              <form action={actualizarLogoEmpresa} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={item.id} />
                <InputImagenOptimizada name="logo" maximo={320} calidad={0.78} maxBytes={100_000} required className="min-w-[220px] flex-1" />
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

function CatalogoEquipos({ items }: { items: { id: string; nombre: string; orden: number; activo: boolean }[] }) {
  return (
    <div className="tarjeta p-4">
      <h3 className="text-lg font-extrabold">Equipos</h3>
      <p className="mt-1 text-xs text-slate-500">Configura los equipos disponibles para asignarlos manualmente antes o después del registro.</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
            <form action={guardarCatalogo} className="grid min-w-0 flex-1 grid-cols-[1fr_55px_auto] gap-2">
              <input type="hidden" name="tipo" value="equipo" />
              <input type="hidden" name="id" value={item.id} />
              <input className="campo !min-h-10 !py-1 text-sm" name="nombre" defaultValue={item.nombre} required />
              <input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={item.orden} required />
              <button className="text-xs font-extrabold text-[var(--epm-azul)]">Guardar</button>
            </form>
            <form action={alternarCatalogo}>
              <input type="hidden" name="tipo" value="equipo" />
              <input type="hidden" name="id" value={item.id} />
              <button className="text-[10px] font-extrabold text-slate-500">{item.activo ? "Desactivar" : "Activar"}</button>
            </form>
          </div>
        ))}
      </div>
      <form action={guardarCatalogo} className="mt-4 grid grid-cols-[1fr_55px_auto] gap-2 border-t pt-4">
        <input type="hidden" name="tipo" value="equipo" />
        <input className="campo !min-h-10 !py-1 text-sm" name="nombre" placeholder="Nuevo equipo" required />
        <input className="campo !min-h-10 !py-1" type="number" name="orden" defaultValue={items.length + 1} required />
        <button className="text-xs font-extrabold text-[var(--epm-azul)]">Agregar</button>
      </form>
    </div>
  );
}
