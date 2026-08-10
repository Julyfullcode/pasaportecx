import { Lightbulb, MessageCircleWarning, Sparkles, TrendingUp } from "lucide-react";

type Analisis = {
  total: number;
  empresas: number;
  temas: string[];
  fortalezas: string[];
  fricciones: string[];
  oportunidades: string[];
  conclusion: string;
};

export function ResumenAnalisisActividad({ analisis, oscuro = false }: { analisis: Analisis; oscuro?: boolean }) {
  return <section className={oscuro ? "rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur" : "tarjeta p-6 md:p-7"}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`font-extrabold tracking-wider ${oscuro ? "text-[var(--epm-verde)]" : "text-[var(--epm-verde-medio)]"}`}>Análisis automático</p><h2 className="mt-1 text-2xl font-extrabold">Conclusión de las respuestas</h2></div><span className={`rounded-full px-4 py-2 text-sm font-extrabold ${oscuro ? "bg-white/15" : "bg-sky-50 text-[var(--epm-azul)]"}`}>{analisis.total} evaluaciones · {analisis.empresas} empresas</span></div>
    <p className={`mt-4 text-lg leading-relaxed ${oscuro ? "text-white/90" : "text-slate-700"}`}>{analisis.conclusion}</p>
    {analisis.temas.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{analisis.temas.map((tema) => <span key={tema} className={`rounded-full px-3 py-1 text-sm font-bold ${oscuro ? "bg-white/15" : "bg-emerald-50 text-emerald-800"}`}>{tema}</span>)}</div>}
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <Bloque titulo="Fortalezas observadas" icono={<Sparkles size={19} />} elementos={analisis.fortalezas} oscuro={oscuro} />
      <Bloque titulo="Fricciones principales" icono={<MessageCircleWarning size={19} />} elementos={analisis.fricciones} oscuro={oscuro} />
      <Bloque titulo="Oportunidades propuestas" icono={<TrendingUp size={19} />} elementos={analisis.oportunidades} oscuro={oscuro} />
    </div>
    <p className={`mt-4 flex items-center gap-2 text-xs ${oscuro ? "text-white/60" : "text-slate-500"}`}><Lightbulb size={15} /> Síntesis preliminar basada en recurrencia y respuestas representativas; debe complementarse con la conversación del equipo.</p>
  </section>;
}

function Bloque({ titulo, icono, elementos, oscuro }: { titulo: string; icono: React.ReactNode; elementos: string[]; oscuro: boolean }) {
  return <div className={`rounded-2xl p-4 ${oscuro ? "bg-black/10" : "bg-slate-50"}`}><h3 className="flex items-center gap-2 font-extrabold">{icono}{titulo}</h3>{elementos.length ? <ul className={`mt-3 space-y-2 text-sm ${oscuro ? "text-white/80" : "text-slate-600"}`}>{elementos.map((item, indice) => <li key={indice}>“{item}”</li>)}</ul> : <p className={`mt-3 text-sm ${oscuro ? "text-white/55" : "text-slate-500"}`}>Aún no hay información suficiente.</p>}</div>;
}
