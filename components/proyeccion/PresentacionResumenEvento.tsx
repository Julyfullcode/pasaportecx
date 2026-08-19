"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  Camera,
  CheckCircle2,
  Expand,
  Heart,
  Images,
  Medal,
  MessageCircleHeart,
  Music,
  Network,
  Pause,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { LogoBlanco } from "@/components/marca/Logo";
import { FotoCircular } from "@/components/marca/FotoCircular";
import { TexturaArcos } from "@/components/marca/TexturaArcos";

type FotoResumen = {
  id: string;
  url: string;
  texto: string | null;
  autoria: string;
  reacciones: number;
};

export type DatosResumenEvento = {
  nombreEvento: string;
  cifras: {
    participantes: number;
    staff: number;
    empresas: number;
    desafios: number;
    completitudes: number;
    participantesConDesafios: number;
    actividades: number;
    participacionesActividad: number;
    resultadosJuego: number;
    recuerdos: number;
    reacciones: number;
    puntos: number;
  };
  personas: { id: string; nombre: string; urlFoto: string; empresa: { nombre: string } }[];
  desafios: { id: string; titulo: string; descripcion: string; urlImagen: string | null; tipo: string }[];
  empresas: { nombre: string; urlLogo: string | null; participantes: number }[];
  podio: { id: string; nombre: string; urlFoto: string; puntosTotales: number; empresa: { nombre: string } }[];
  fotos: FotoResumen[];
  satisfaccion: {
    nps: number | null;
    respuestasNps: number;
    promotores: number;
    pasivos: number;
    detractores: number;
    comentarios: string[];
  };
};

type Diapositiva =
  | { tipo: "portada"; duracion: number }
  | { tipo: "cifras"; duracion: number }
  | { tipo: "registro"; duracion: number }
  | { tipo: "participacion"; duracion: number }
  | { tipo: "empresas"; duracion: number }
  | { tipo: "fotos"; duracion: number; fotos: FotoResumen[] }
  | { tipo: "podio"; duracion: number }
  | { tipo: "satisfaccion"; duracion: number }
  | { tipo: "reflexion"; duracion: number }
  | { tipo: "cierre"; duracion: number };

const PALETA = ["#3fa9e0", "#8cc63f", "#12b886", "#f7c948", "#f78c6b", "#a78bfa", "#38bdf8", "#fb7185"];

function agrupar<T>(valores: T[], tamano: number) {
  const grupos: T[][] = [];
  for (let indice = 0; indice < valores.length; indice += tamano) grupos.push(valores.slice(indice, indice + tamano));
  return grupos;
}

function ruidoDeterminista(valor: number) {
  const resultado = Math.sin(valor * 12.9898) * 43_758.5453;
  return resultado - Math.floor(resultado);
}

function useMusicaAmbiental() {
  const motor = useRef<{ contexto: AudioContext; ganancia: GainNode; temporizador: number; paso: number } | null>(null);
  const [activa, setActiva] = useState(false);

  const iniciar = useCallback(() => {
    if (motor.current) {
      void motor.current.contexto.resume();
      motor.current.ganancia.gain.setTargetAtTime(0.13, motor.current.contexto.currentTime, 0.3);
      setActiva(true);
      return;
    }
    const contexto = new AudioContext();
    const ganancia = contexto.createGain();
    ganancia.gain.setValueAtTime(0.0001, contexto.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.13, contexto.currentTime + 1.2);
    ganancia.connect(contexto.destination);
    const ruido = contexto.createBuffer(1, contexto.sampleRate, contexto.sampleRate);
    const canalRuido = ruido.getChannelData(0);
    for (let indice = 0; indice < canalRuido.length; indice += 1) canalRuido[indice] = Math.random() * 2 - 1;
    const melodia = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 880, 783.99, 659.25, 523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 493.88];
    const raices = [130.81, 98, 110, 87.31];
    const acordes = [
      [261.63, 329.63, 392],
      [196, 246.94, 392],
      [220, 261.63, 329.63],
      [174.61, 220, 349.23],
    ];
    const tocar = (frecuencia: number, cuando: number, duracion: number, volumen: number, tipo: OscillatorType = "triangle") => {
      const oscilador = contexto.createOscillator();
      const envolvente = contexto.createGain();
      oscilador.type = tipo;
      oscilador.frequency.setValueAtTime(frecuencia, cuando);
      envolvente.gain.setValueAtTime(0.0001, cuando);
      envolvente.gain.exponentialRampToValueAtTime(volumen, cuando + 0.025);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion);
      oscilador.connect(envolvente);
      envolvente.connect(ganancia);
      oscilador.start(cuando);
      oscilador.stop(cuando + duracion + 0.04);
    };
    const golpe = (cuando: number) => {
      const oscilador = contexto.createOscillator();
      const envolvente = contexto.createGain();
      oscilador.type = "sine";
      oscilador.frequency.setValueAtTime(135, cuando);
      oscilador.frequency.exponentialRampToValueAtTime(46, cuando + 0.2);
      envolvente.gain.setValueAtTime(0.24, cuando);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.23);
      oscilador.connect(envolvente);
      envolvente.connect(ganancia);
      oscilador.start(cuando);
      oscilador.stop(cuando + 0.24);
    };
    const percusion = (cuando: number, tipo: "hat" | "clap") => {
      const fuente = contexto.createBufferSource();
      const filtro = contexto.createBiquadFilter();
      const envolvente = contexto.createGain();
      fuente.buffer = ruido;
      filtro.type = tipo === "hat" ? "highpass" : "bandpass";
      filtro.frequency.value = tipo === "hat" ? 6_500 : 1_650;
      filtro.Q.value = tipo === "hat" ? 0.8 : 1.2;
      envolvente.gain.setValueAtTime(tipo === "hat" ? 0.045 : 0.11, cuando);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, cuando + (tipo === "hat" ? 0.07 : 0.18));
      fuente.connect(filtro);
      filtro.connect(envolvente);
      envolvente.connect(ganancia);
      fuente.start(cuando);
      fuente.stop(cuando + (tipo === "hat" ? 0.08 : 0.19));
    };
    const estado = { contexto, ganancia, temporizador: 0, paso: 0 };
    const pulso = () => {
      const ahora = contexto.currentTime + 0.025;
      const pasoCompas = estado.paso % 8;
      const compas = Math.floor(estado.paso / 8) % acordes.length;
      percusion(ahora, "hat");
      if (pasoCompas === 0 || pasoCompas === 4 || (pasoCompas === 6 && compas % 2 === 1)) golpe(ahora);
      if (pasoCompas === 2 || pasoCompas === 6) percusion(ahora, "clap");
      if ([0, 3, 4, 7].includes(pasoCompas)) tocar(raices[compas], ahora, 0.42, 0.12, "triangle");
      tocar(melodia[estado.paso % melodia.length], ahora, 0.19, pasoCompas % 2 === 0 ? 0.055 : 0.035, "square");
      if (pasoCompas === 0) acordes[compas].forEach((frecuencia) => tocar(frecuencia, ahora, 1.85, 0.018, "sine"));
      estado.paso += 1;
    };
    pulso();
    estado.temporizador = window.setInterval(pulso, 268);
    motor.current = estado;
    setActiva(true);
  }, []);

  const alternar = useCallback(() => {
    const actual = motor.current;
    if (!actual) return iniciar();
    if (activa) {
      actual.ganancia.gain.setTargetAtTime(0.0001, actual.contexto.currentTime, 0.18);
      window.setTimeout(() => void actual.contexto.suspend(), 500);
      setActiva(false);
    } else {
      void actual.contexto.resume();
      actual.ganancia.gain.setTargetAtTime(0.13, actual.contexto.currentTime, 0.22);
      setActiva(true);
    }
  }, [activa, iniciar]);

  useEffect(() => () => {
    if (!motor.current) return;
    window.clearInterval(motor.current.temporizador);
    void motor.current.contexto.close();
  }, []);

  return { activa, iniciar, alternar };
}

export function PresentacionResumenEvento({ datos }: { datos: DatosResumenEvento }) {
  const diapositivas = useMemo<Diapositiva[]>(() => {
    const duracionRegistro = Math.max(12_000, Math.ceil(datos.personas.length / 8) * 3_000);
    const duracionCifras = Math.max(
      12_000,
      Math.ceil(datos.personas.length / 6) * 2_800,
      Math.ceil(datos.empresas.length / 4) * 3_400,
      Math.ceil(datos.desafios.length / 2) * 4_000,
      Math.ceil(datos.fotos.length / 4) * 3_200,
    );
    const fotos: Diapositiva[] = datos.fotos.length ? [{
      tipo: "fotos",
      duracion: Math.max(14_000, Math.ceil(datos.fotos.length / 6) * 4_800),
      fotos: datos.fotos,
    }] : [];
    return [
      { tipo: "portada", duracion: 8_000 },
      { tipo: "cifras", duracion: duracionCifras },
      { tipo: "registro", duracion: duracionRegistro },
      { tipo: "participacion", duracion: 10_000 },
      { tipo: "empresas", duracion: 10_000 },
      ...fotos,
      ...(datos.podio.length ? [{ tipo: "podio" as const, duracion: 11_000 }] : []),
      { tipo: "satisfaccion", duracion: Math.max(12_000, Math.ceil(Math.max(1, datos.satisfaccion.comentarios.length) / 6) * 5_200) },
      { tipo: "reflexion", duracion: 12_000 },
      { tipo: "cierre", duracion: 12_000 },
    ];
  }, [datos.desafios.length, datos.empresas.length, datos.fotos, datos.personas.length, datos.podio.length, datos.satisfaccion.comentarios.length]);
  const [iniciada, setIniciada] = useState(false);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const { activa: musicaActiva, iniciar: iniciarMusica, alternar: alternarMusica } = useMusicaAmbiental();

  const mover = useCallback((direccion: -1 | 1) => {
    setIndice((actual) => (actual + direccion + diapositivas.length) % diapositivas.length);
  }, [diapositivas.length]);

  useEffect(() => {
    if (!iniciada || !reproduciendo) return;
    const temporizador = window.setTimeout(() => mover(1), diapositivas[indice].duracion);
    return () => window.clearTimeout(temporizador);
  }, [diapositivas, indice, iniciada, mover, reproduciendo]);

  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === "ArrowLeft") mover(-1);
      if (evento.key === "ArrowRight") mover(1);
      if (evento.key === " ") {
        evento.preventDefault();
        setReproduciendo((actual) => !actual);
      }
      if (evento.key.toLowerCase() === "m") alternarMusica();
      if (evento.key.toLowerCase() === "f") void document.documentElement.requestFullscreen().catch(() => undefined);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [alternarMusica, mover]);

  function comenzar(conMusica: boolean) {
    setIniciada(true);
    setReproduciendo(true);
    if (conMusica) iniciarMusica();
    void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  const actual = diapositivas[indice];
  return (
    <main className="marca-gradiente relative h-screen overflow-hidden text-white">
      <TexturaArcos />
      <div className="pointer-events-none absolute -left-[10vw] top-[45%] h-[35vw] w-[35vw] rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-[8vw] -top-[12vw] h-[38vw] w-[38vw] rounded-full bg-lime-300/15 blur-3xl" />

      {!iniciada && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[var(--epm-azul-profundo)]/88 p-6 backdrop-blur-xl">
          <div className="w-full max-w-3xl text-center">
            <LogoBlanco className="mx-auto h-[clamp(42px,6vw,74px)] w-auto" />
            <div className="mx-auto mt-10 grid h-20 w-20 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-[0_0_50px_rgba(140,198,63,.45)]"><Music size={38} /></div>
            <p className="mt-8 font-extrabold uppercase tracking-[.24em] text-[var(--epm-verde)]">Presentación final</p>
            <h1 className="mt-3 font-display text-[clamp(38px,6vw,78px)] font-extrabold leading-[.98]">El evento en cifras y recuerdos</h1>
            <p className="mx-auto mt-5 max-w-2xl text-[clamp(16px,1.5vw,23px)] text-white/70">Un recorrido automático por las personas, los logros y las fotos que hicieron parte de {datos.nombreEvento}.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => comenzar(true)} className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[var(--epm-verde)] px-7 font-extrabold text-[var(--epm-azul-profundo)] shadow-xl transition hover:scale-105"><Volume2 /> Comenzar con música</button>
              <button type="button" onClick={() => comenzar(false)} className="inline-flex min-h-14 items-center gap-3 rounded-full border border-white/30 bg-white/10 px-7 font-extrabold backdrop-blur transition hover:bg-white/20"><VolumeX /> Comenzar sin música</button>
            </div>
            <p className="mt-6 text-sm text-white/50">Flechas para navegar · Espacio para pausar · M para música · F para pantalla completa</p>
          </div>
        </div>
      )}

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-[clamp(20px,3vw,52px)] py-[clamp(18px,2.5vh,30px)]">
        <LogoBlanco className="h-[clamp(32px,3.4vw,54px)] w-auto" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={alternarMusica} aria-label={musicaActiva ? "Silenciar música" : "Activar música"} title={musicaActiva ? "Silenciar música" : "Activar música"} className={`grid h-11 w-11 place-items-center rounded-full border border-white/15 backdrop-blur ${musicaActiva ? "bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]" : "bg-white/10"}`}>{musicaActiva ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          <button type="button" onClick={() => void document.documentElement.requestFullscreen().catch(() => undefined)} aria-label="Pantalla completa" title="Pantalla completa" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur"><Expand size={20} /></button>
        </div>
      </header>

      <div key={`${actual.tipo}-${indice}`} className="entrada-suave relative z-10 h-full px-[clamp(24px,5vw,92px)] pb-[clamp(78px,10vh,112px)] pt-[clamp(88px,12vh,126px)]">
        {actual.tipo === "portada" && <Portada nombre={datos.nombreEvento} />}
        {actual.tipo === "cifras" && <Cifras datos={datos} />}
        {actual.tipo === "registro" && <RegistroPersonas datos={datos} />}
        {actual.tipo === "participacion" && <Participacion datos={datos} />}
        {actual.tipo === "empresas" && <Empresas empresas={datos.empresas} total={datos.cifras.participantes} />}
        {actual.tipo === "fotos" && <Fotos fotos={actual.fotos} />}
        {actual.tipo === "podio" && <PodioResumen personas={datos.podio} />}
        {actual.tipo === "satisfaccion" && <Satisfaccion satisfaccion={datos.satisfaccion} />}
        {actual.tipo === "reflexion" && <ReflexionTecnologia />}
        {actual.tipo === "cierre" && <Cierre datos={datos} />}
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-30 px-[clamp(18px,3vw,48px)] pb-[clamp(14px,2vh,24px)]">
        <div className="mb-3 flex gap-1.5">
          {diapositivas.map((diapositiva, posicion) => <button key={`${diapositiva.tipo}-${posicion}`} type="button" aria-label={`Ir a la diapositiva ${posicion + 1}`} onClick={() => setIndice(posicion)} className={`h-1.5 min-h-0 flex-1 rounded-full transition ${posicion === indice ? "bg-[var(--epm-verde)]" : posicion < indice ? "bg-white/45" : "bg-white/15"}`} />)}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-white/60">{indice + 1} de {diapositivas.length}</span>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/25 p-1.5 backdrop-blur">
            <button type="button" onClick={() => mover(-1)} aria-label="Anterior" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15"><ArrowLeft /></button>
            <button type="button" onClick={() => setReproduciendo((actual) => !actual)} aria-label={reproduciendo ? "Pausar" : "Reproducir"} className="grid h-11 w-11 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)]">{reproduciendo ? <Pause /> : <Play />}</button>
            <button type="button" onClick={() => mover(1)} aria-label="Siguiente" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15"><ArrowRight /></button>
          </div>
          <span className="text-right text-sm font-bold text-white/60">Vicepresidencia Experiencia Usuario-Cliente</span>
        </div>
      </footer>
      <style jsx global>{`
        @keyframes avatar-registro-ciclo {
          0% { opacity: 0; transform: scale(.5) translateY(24px); filter: blur(6px); }
          16% { opacity: 1; transform: scale(1) translateY(-3px); filter: blur(0); }
          76% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: scale(.82) translateY(-18px); filter: blur(5px); }
        }
        @keyframes miniatura-cifra-entrada {
          0% { opacity: 0; transform: translateY(14px) scale(.76); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes foto-historia-viva {
          0% { opacity: 0; transform: translateY(28px) scale(.82) rotate(var(--giro-foto)); filter: blur(7px); }
          13% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); filter: blur(0); }
          72% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-22px) scale(.9) rotate(calc(var(--giro-foto) * -1)); filter: blur(5px); }
        }
        @keyframes nodo-conexion {
          0%, 100% { transform: scale(.92); box-shadow: 0 0 0 0 rgba(140,198,63,.35); }
          50% { transform: scale(1.07); box-shadow: 0 0 0 22px rgba(140,198,63,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .avatar-registro-animado, .miniatura-cifra-animada, .foto-historia-animada, .nodo-conexion-animado { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </main>
  );
}

function Titulo({ etiqueta, titulo, descripcion }: { etiqueta: string; titulo: string; descripcion?: string }) {
  return <div className="mb-[clamp(18px,3vh,34px)]"><p className="font-extrabold uppercase tracking-[.2em] text-[var(--epm-verde)]">{etiqueta}</p><h2 className="mt-2 font-display text-[clamp(34px,4.5vw,68px)] font-extrabold leading-none">{titulo}</h2>{descripcion && <p className="mt-3 max-w-4xl text-[clamp(15px,1.35vw,21px)] text-white/65">{descripcion}</p>}</div>;
}

function Portada({ nombre }: { nombre: string }) {
  return <section className="grid h-full place-items-center overflow-hidden pb-[clamp(24px,4vh,48px)] text-center"><div className="max-h-full"><div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 font-extrabold text-[var(--epm-verde)] backdrop-blur"><Sparkles size={21} /> Lo que vivimos juntos</div><h1 className="mx-auto mt-[clamp(18px,3vh,30px)] max-w-6xl font-display text-[clamp(42px,5.6vw,82px)] font-extrabold leading-[.9]"><span className="text-[var(--epm-verde)]">{nombre}</span><br />en cifras y recuerdos</h1><p className="mt-[clamp(16px,2.5vh,26px)] text-[clamp(17px,1.6vw,25px)] text-white/65">Personas, conversaciones y momentos que dejan huella.</p></div></section>;
}

function TarjetaCifra({ valor, etiqueta, Icono, color, contenido }: { valor: number; etiqueta: string; Icono: typeof Users; color: string; contenido?: ReactNode }) {
  return <article className="relative flex min-h-0 flex-col overflow-hidden rounded-[clamp(22px,2.2vw,34px)] border border-white/15 bg-white/10 p-[clamp(16px,1.7vw,27px)] shadow-2xl backdrop-blur"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl" style={{ background: color }} /><div className="relative flex items-center justify-between gap-3"><span className="grid h-[clamp(42px,3.6vw,58px)] w-[clamp(42px,3.6vw,58px)] place-items-center rounded-2xl text-[var(--epm-azul-profundo)] shadow-lg" style={{ background: color }}><Icono size={26} /></span><strong className="font-display text-[clamp(40px,4.5vw,70px)] font-extrabold leading-none">{valor.toLocaleString("es-CO")}</strong></div>{contenido && <div className="relative my-[clamp(10px,1.4vh,18px)] min-h-0 flex-1">{contenido}</div>}<p className="relative border-t border-white/15 pt-3 font-display text-[clamp(18px,1.35vw,24px)] font-extrabold leading-tight text-white">{etiqueta}</p></article>;
}

function Cifras({ datos }: { datos: DatosResumenEvento }) {
  const cifras = [
    { valor: datos.cifras.participantes, etiqueta: "personas hicieron parte", Icono: Users, color: "#8cc63f", contenido: <PersonasCifra personas={datos.personas} /> },
    { valor: datos.cifras.empresas, etiqueta: "empresas conectadas", Icono: Building2, color: "#3fa9e0", contenido: <EmpresasCifra empresas={datos.empresas} /> },
    { valor: datos.cifras.desafios, etiqueta: "desafíos del recorrido", Icono: Target, color: "#f7c948", contenido: <DesafiosCifra desafios={datos.desafios} /> },
    { valor: datos.cifras.recuerdos, etiqueta: "momentos compartidos", Icono: Camera, color: "#fb7185", contenido: <MomentosCifra fotos={datos.fotos} /> },
  ];
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="El encuentro" titulo="Una experiencia construida entre todos" descripcion={`${datos.cifras.staff.toLocaleString("es-CO")} integrantes del equipo Staff acompañaron la experiencia.`} /><div className="grid min-h-0 flex-1 grid-cols-4 gap-[clamp(12px,1.8vw,26px)]">{cifras.map((cifra) => <TarjetaCifra key={cifra.etiqueta} {...cifra} />)}</div></section>;
}

function PersonasCifra({ personas }: { personas: DatosResumenEvento["personas"] }) {
  const grupos = useMemo(() => agrupar(personas, 6), [personas]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 2_800);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  return <div data-testid="cifras-personas-fotos" className="grid h-full grid-cols-2 grid-rows-3 place-items-center gap-x-[clamp(12px,1.2vw,20px)] gap-y-2 overflow-hidden">{(grupos[pagina] ?? []).map((persona, indice) => <div key={`${persona.id}-${pagina}`} className="miniatura-cifra-animada grid h-full w-full place-items-center overflow-hidden" style={{ animation: `avatar-registro-ciclo 2.55s ${indice * .055}s ease-out both` }}><FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-[clamp(86px,5.8vw,102px)] w-[clamp(86px,5.8vw,102px)] border-[4px] shadow-xl" /></div>)}</div>;
}

function EmpresasCifra({ empresas }: { empresas: DatosResumenEvento["empresas"] }) {
  const grupos = useMemo(() => agrupar(empresas, 4), [empresas]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 3_400);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  return <div data-testid="cifras-empresas-logos" className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-[clamp(18px,1.6vw,28px)] overflow-hidden p-2">{(grupos[pagina] ?? []).map((empresa, indice) => <div key={`${empresa.nombre}-${pagina}`} className="miniatura-cifra-animada grid min-h-0 min-w-0 place-items-center overflow-hidden" style={{ animation: `miniatura-cifra-entrada .5s ${indice * .09}s ease-out both` }}>{empresa.urlLogo ? <img src={empresa.urlLogo} alt={`Logo ${empresa.nombre}`} className="block max-h-[72%] max-w-[86%] object-contain opacity-95 [filter:brightness(0)_invert(1)_drop-shadow(0_2px_5px_rgba(0,0,0,.32))]" /> : <span className="line-clamp-2 text-center font-display text-[clamp(16px,1.25vw,21px)] font-extrabold leading-tight text-white">{empresa.nombre}</span>}</div>)}</div>;
}

function DesafiosCifra({ desafios }: { desafios: DatosResumenEvento["desafios"] }) {
  const grupos = useMemo(() => agrupar(desafios, 2), [desafios]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 4_000);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  return <div data-testid="cifras-desafios" className="grid h-full min-h-0 grid-rows-2 overflow-hidden">{(grupos[pagina] ?? []).map((desafio, indice) => { const color = PALETA[(pagina * 2 + indice) % PALETA.length]; return <div key={`${desafio.id}-${pagina}`} className="miniatura-cifra-animada relative flex min-h-0 items-center gap-[clamp(14px,1.2vw,20px)] overflow-hidden border-b border-white/[.18] px-1 py-4 text-left last:border-b-0" style={{ animation: `miniatura-cifra-entrada .5s ${indice * .12}s ease-out both` }}>{desafio.urlImagen ? <img src={desafio.urlImagen} alt="" className="h-[clamp(68px,5vw,88px)] w-[clamp(68px,5vw,88px)] shrink-0 rounded-2xl object-cover shadow-lg" /> : <span className="grid h-[clamp(68px,5vw,88px)] w-[clamp(68px,5vw,88px)] shrink-0 place-items-center rounded-full border-2 border-white/20"><Zap size={36} style={{ color }} /></span>}<span className="min-w-0 overflow-hidden"><strong className="line-clamp-2 block font-display text-[clamp(18px,1.35vw,23px)] font-extrabold leading-tight text-white">{desafio.titulo}</strong><small className="mt-2 line-clamp-2 block overflow-hidden text-[clamp(13px,.95vw,16px)] font-medium leading-snug text-white/72">{desafio.descripcion}</small></span></div>; })}</div>;
}

function MomentosCifra({ fotos }: { fotos: FotoResumen[] }) {
  const grupos = useMemo(() => agrupar(fotos, 4), [fotos]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 3_200);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  return <div data-testid="cifras-momentos-fotos" className="grid h-full grid-cols-2 grid-rows-2 gap-2">{(grupos[pagina] ?? []).map((foto, indice) => <img key={`${foto.id}-${pagina}`} src={foto.url} alt={foto.texto || "Momento del encuentro"} className="miniatura-cifra-animada h-full min-h-0 w-full rounded-xl object-cover shadow-lg" style={{ animation: `foto-historia-viva 2.9s ${indice * .08}s ease-out both`, "--giro-foto": "0deg" } as CSSProperties} />)}</div>;
}

function RegistroPersonas({ datos }: { datos: DatosResumenEvento }) {
  const grupos = useMemo(() => agrupar(datos.personas, 8), [datos.personas]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 3_000);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  const muestra = grupos[pagina] ?? [];
  const zonas: (CSSProperties & { width: string; height: string })[] = [
    { left: "0%", top: "0%", width: "clamp(150px,9.4vw,178px)", height: "clamp(150px,9.4vw,178px)" },
    { left: "18%", top: "4%", width: "clamp(126px,7.4vw,142px)", height: "clamp(126px,7.4vw,142px)" },
    { right: "18%", top: "3%", width: "clamp(132px,7.7vw,148px)", height: "clamp(132px,7.7vw,148px)" },
    { right: "0%", top: "0%", width: "clamp(148px,9.2vw,174px)", height: "clamp(148px,9.2vw,174px)" },
    { left: "2%", top: "35%", width: "clamp(132px,7.8vw,150px)", height: "clamp(132px,7.8vw,150px)" },
    { right: "2%", top: "37%", width: "clamp(128px,7.6vw,146px)", height: "clamp(128px,7.6vw,146px)" },
    { left: "7%", top: "61%", width: "clamp(140px,8.2vw,158px)", height: "clamp(140px,8.2vw,158px)" },
    { right: "6%", top: "59%", width: "clamp(148px,8.8vw,168px)", height: "clamp(148px,8.8vw,168px)" },
  ];
  const posiciones = zonas
    .map((zona, indice) => ({ zona, orden: ruidoDeterminista((pagina + 1) * 31 + indice * 17) }))
    .sort((a, b) => a.orden - b.orden)
    .map(({ zona }) => zona);
  const inicio = pagina * 8 + 1;
  const fin = Math.min((pagina + 1) * 8, datos.personas.length);
  return <section className="relative grid h-full place-items-center overflow-hidden text-center"><div className="relative z-10 max-w-[720px] rounded-[3rem] bg-[var(--epm-azul-profundo)]/62 px-[clamp(26px,3.4vw,52px)] py-[clamp(18px,2.2vh,28px)] shadow-[0_0_80px_rgba(4,29,49,.72)] backdrop-blur-sm"><div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 font-extrabold text-[var(--epm-verde)]"><Users size={22} /> Una comunidad que creció</div><strong className="mt-3 block font-display text-[clamp(68px,7.5vw,108px)] font-extrabold leading-[.76] text-[var(--epm-verde)]">{datos.cifras.participantes.toLocaleString("es-CO")}</strong><h2 className="mx-auto mt-4 font-display text-[clamp(30px,3.2vw,48px)] font-extrabold leading-[.98]">personas se registraron en la app</h2><p className="mx-auto mt-3 max-w-2xl text-[clamp(13px,1vw,17px)] text-white/65">Cada registro representa una voz, una empresa y una historia que hizo parte del encuentro.</p><p className="mt-3 text-sm font-extrabold text-[var(--epm-verde)]">Rostros {inicio}–{fin} de {datos.personas.length}</p></div>{muestra.map((persona, indice) => <div key={`${persona.id}-${pagina}`} className="avatar-registro-animado absolute hidden overflow-hidden rounded-full border-4 border-white/35 bg-white/10 p-1 shadow-[0_14px_34px_rgba(0,0,0,.3)] backdrop-blur lg:block" style={{ ...posiciones[indice], animation: `avatar-registro-ciclo 2.65s ${indice * .025}s cubic-bezier(.2,.9,.25,1.1) both` }}><FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className="h-full w-full" /></div>)}</section>;
}

function Participacion({ datos }: { datos: DatosResumenEvento }) {
  const porcentaje = datos.cifras.participantes ? Math.round(datos.cifras.participantesConDesafios * 100 / datos.cifras.participantes) : 0;
  const promedioDesafios = datos.cifras.participantesConDesafios ? (datos.cifras.completitudes / datos.cifras.participantesConDesafios).toFixed(1) : "0";
  const promedioPuntos = datos.cifras.participantes ? Math.round(datos.cifras.puntos / datos.cifras.participantes) : 0;
  const promedioReacciones = datos.cifras.recuerdos ? (datos.cifras.reacciones / datos.cifras.recuerdos).toFixed(1) : "0";
  const items = [
    { valor: datos.cifras.completitudes, etiqueta: "desafíos completados", Icono: CheckCircle2, color: "#8cc63f", destacado: datos.cifras.participantesConDesafios.toLocaleString("es-CO"), detalle: "personas participaron", apoyo: `${promedioDesafios} retos por persona` },
    { valor: datos.cifras.puntos, etiqueta: "puntos acumulados", Icono: Trophy, color: "#f7c948", destacado: promedioPuntos.toLocaleString("es-CO"), detalle: "puntos por participante", apoyo: "logros convertidos en avance" },
    { valor: datos.cifras.participacionesActividad + datos.cifras.resultadosJuego, etiqueta: "participaciones en actividades", Icono: Award, color: "#3fa9e0", destacado: datos.cifras.actividades.toLocaleString("es-CO"), detalle: "actividades activadas", apoyo: `${datos.cifras.resultadosJuego.toLocaleString("es-CO")} resultados de juego` },
    { valor: datos.cifras.reacciones, etiqueta: "reacciones a los recuerdos", Icono: Heart, color: "#fb7185", destacado: datos.cifras.recuerdos.toLocaleString("es-CO"), detalle: "momentos compartidos", apoyo: `${promedioReacciones} reacciones por recuerdo` },
  ];
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Participación" titulo="La experiencia se puso en movimiento" /><div className="grid min-h-0 flex-1 grid-cols-[.72fr_1.28fr] gap-[clamp(16px,2.5vw,38px)]"><article className="grid place-items-center rounded-[2.5rem] border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur"><div><div className="relative mx-auto grid h-[clamp(220px,25vw,330px)] w-[clamp(220px,25vw,330px)] place-items-center rounded-full" style={{ background: `conic-gradient(var(--epm-verde) ${porcentaje}%, rgba(255,255,255,.13) 0)` }}><div className="absolute inset-5 rounded-full bg-[var(--epm-azul-profundo)]/95" /><strong className="relative font-display text-[clamp(58px,7vw,104px)] font-extrabold">{porcentaje}%</strong></div><p className="mt-5 text-xl font-bold text-white/75">participó en al menos un desafío</p><div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3"><strong className="block font-display text-3xl text-[var(--epm-verde)]">{datos.cifras.participantesConDesafios}</strong><span className="text-xs font-bold text-white/55">personas activas</span></div><div className="rounded-2xl bg-white/10 p-3"><strong className="block font-display text-3xl text-white">{datos.cifras.participantes}</strong><span className="text-xs font-bold text-white/55">registros totales</span></div></div></div></article><div className="grid grid-cols-2 gap-[clamp(12px,1.7vw,24px)]">{items.map((item) => <TarjetaParticipacion key={item.etiqueta} {...item} />)}</div></div></section>;
}

function TarjetaParticipacion({ valor, etiqueta, Icono, color, destacado, detalle, apoyo }: { valor: number; etiqueta: string; Icono: typeof Users; color: string; destacado: string; detalle: string; apoyo: string }) {
  return <article className="relative flex min-h-0 flex-col overflow-hidden rounded-[clamp(22px,2vw,32px)] border border-white/15 bg-white/10 p-[clamp(16px,1.6vw,25px)] shadow-2xl backdrop-blur"><Icono className="absolute -bottom-8 -right-6 opacity-[.07]" size={150} /><div className="relative flex items-start justify-between gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[var(--epm-azul-profundo)] shadow-lg" style={{ background: color }}><Icono size={24} /></span><strong className="font-display text-[clamp(38px,4.2vw,66px)] font-extrabold leading-none text-white">{valor.toLocaleString("es-CO")}</strong></div><h3 className="relative mt-3 text-[clamp(13px,1vw,17px)] font-extrabold text-white/75">{etiqueta}</h3><div className="relative mt-auto grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl bg-slate-950/20 p-3"><strong className="font-display text-[clamp(27px,2.5vw,42px)] font-extrabold" style={{ color }}>{destacado}</strong><div className="min-w-0 text-left"><p className="text-[clamp(10px,.8vw,13px)] font-extrabold text-white/80">{detalle}</p><p className="mt-1 text-[clamp(9px,.7vw,11px)] text-white/50">{apoyo}</p></div></div></article>;
}

function Empresas({ empresas, total }: { empresas: DatosResumenEvento["empresas"]; total: number }) {
  const maximo = Math.max(1, ...empresas.map((empresa) => empresa.participantes));
  const filas = Math.max(1, Math.ceil(empresas.length / 2));
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Conexiones" titulo="Un solo equipo, muchas voces" descripcion={`${empresas.length} empresas representadas en el encuentro.`} /><div className="grid min-h-0 flex-1 grid-cols-2 gap-x-10 gap-y-2 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-[clamp(20px,2.3vw,36px)] backdrop-blur" style={{ gridTemplateRows: `repeat(${filas}, minmax(42px, 1fr))` }}>{empresas.map((empresa, indice) => <div key={empresa.nombre} className="grid min-h-0 grid-rows-[auto_12px] content-center gap-1.5"><div className="flex items-end justify-between gap-3"><strong className="truncate text-[clamp(13px,1.15vw,18px)]">{empresa.nombre}</strong><span data-testid="empresa-participantes" className="font-display text-xl font-extrabold text-white drop-shadow-md">{empresa.participantes}</span></div><div data-testid="barra-empresa" className="h-3 shrink-0 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full shadow-[0_0_16px_currentColor] transition-all duration-1000" style={{ width: `${Math.max(5, empresa.participantes * 100 / maximo)}%`, background: PALETA[indice % PALETA.length], color: PALETA[indice % PALETA.length] }} /></div></div>)}</div><p className="mt-3 text-right text-sm text-white/60">{total.toLocaleString("es-CO")} participantes en total</p></section>;
}

function Fotos({ fotos }: { fotos: FotoResumen[] }) {
  const grupos = useMemo(() => agrupar(fotos, 6), [fotos]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 4_800);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  const visibles = grupos[pagina] ?? [];
  const inicio = pagina * 6 + 1;
  const fin = Math.min((pagina + 1) * 6, fotos.length);
  const estructura = visibles.length === 1 ? "grid-cols-1 grid-rows-1" : visibles.length === 2 ? "grid-cols-2 grid-rows-1" : visibles.length === 3 ? "grid-cols-3 grid-rows-1" : visibles.length === 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-3 grid-rows-2";
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Momentos del encuentro" titulo="Imágenes que cuentan nuestra historia" descripcion={`Las fotos ${inicio}–${fin} de ${fotos.length} aparecen y dan paso a nuevos recuerdos en esta misma pantalla.`} /><div data-testid="galeria-rotativa" className={`grid min-h-0 flex-1 ${estructura} gap-[clamp(10px,1.2vw,18px)]`}>{visibles.map((foto, indice) => <figure key={`${foto.id}-${pagina}`} className="foto-historia-animada relative min-h-0 overflow-hidden rounded-[clamp(18px,1.8vw,28px)] bg-slate-950 shadow-2xl" style={{ animation: `foto-historia-viva 4.3s ${indice * .08}s cubic-bezier(.2,.8,.2,1) both`, "--giro-foto": `${indice % 2 === 0 ? -2.2 : 2.2}deg` } as CSSProperties}><img src={foto.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" /><img src={foto.url} alt={foto.texto || `Momento compartido por ${foto.autoria}`} className="relative z-[1] h-full w-full object-contain" /><figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-4 pt-12"><p className="line-clamp-2 text-[clamp(11px,1vw,16px)] font-bold">{foto.texto || "Un momento para recordar"}</p><div className="mt-1 flex justify-between gap-2 text-[clamp(10px,.85vw,13px)] text-white/65"><span className="truncate">{foto.autoria}</span>{foto.reacciones > 0 && <span className="shrink-0">♥ {foto.reacciones}</span>}</div></figcaption></figure>)}</div></section>;
}

function PodioResumen({ personas }: { personas: DatosResumenEvento["podio"] }) {
  const orden = [personas[1], personas[0], personas[2]].filter(Boolean);
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Reconocimiento" titulo="Personas que dejaron huella" /><p className="mx-auto mb-[clamp(12px,1.8vh,20px)] max-w-6xl text-center text-[clamp(15px,1.15vw,19px)] leading-relaxed text-white/72">Durante el encuentro activamos una experiencia gamificada: cada participante sumó puntos completando desafíos, aportando ideas y viviendo los diferentes momentos de la jornada. Aquí están quienes lideraron el podio, <strong className="font-extrabold text-[var(--epm-verde)]">¡pero la verdadera victoria fue la participación de todos!</strong></p><div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-[clamp(16px,2.2vw,34px)]">{orden.map((persona) => { const puesto = personas.findIndex((item) => item.id === persona.id) + 1; const primero = puesto === 1; return <article key={persona.id} className={`relative flex min-h-0 flex-col items-center justify-center rounded-[2.4rem] border p-4 text-center shadow-2xl backdrop-blur ${primero ? "h-full border-amber-300 bg-amber-300/20" : "h-[94%] border-white/15 bg-white/10"}`}><span className={`absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full font-display text-xl font-extrabold ${primero ? "bg-amber-300 text-amber-950" : "bg-white/15"}`}>{puesto}</span>{primero ? <Medal className="mb-1 text-amber-300" size={32} /> : <Award className="mb-1 text-[var(--epm-verde)]" size={30} />}<FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={`${primero ? "h-[clamp(190px,23vh,270px)] w-[clamp(190px,23vh,270px)]" : "h-[clamp(172px,21vh,245px)] w-[clamp(172px,21vh,245px)]"} border-[5px]`} /><h3 className="mt-3 text-[clamp(19px,1.8vw,29px)] font-extrabold leading-tight">{persona.nombre}</h3><p className="mt-1 text-sm text-white/60">{persona.empresa.nombre}</p><strong className={`mt-2 font-display text-[clamp(32px,3vw,48px)] ${primero ? "text-amber-300" : "text-[var(--epm-verde)]"}`}>{persona.puntosTotales.toLocaleString("es-CO")} <small className="text-[.35em] text-white/60">pts</small></strong></article>; })}</div></section>;
}

function Satisfaccion({ satisfaccion }: { satisfaccion: DatosResumenEvento["satisfaccion"] }) {
  const grupos = useMemo(() => agrupar(satisfaccion.comentarios, 6), [satisfaccion.comentarios]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (grupos.length <= 1) return;
    const temporizador = window.setInterval(() => setPagina((actual) => (actual + 1) % grupos.length), 5_200);
    return () => window.clearInterval(temporizador);
  }, [grupos.length]);
  const comentarios = grupos[pagina] ?? [];
  const porcentaje = (valor: number) => satisfaccion.respuestasNps ? Math.round(valor * 100 / satisfaccion.respuestasNps) : 0;
  const nps = satisfaccion.nps;
  const colorNps = nps === null ? "#ffffff" : nps >= 50 ? "#8cc63f" : nps >= 0 ? "#f7c948" : "#fb7185";
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Satisfacción" titulo="Las voces que nos impulsan" descripcion={`${satisfaccion.comentarios.length} comentarios positivos recogen lo que las personas más valoraron del encuentro.`} /><div className="grid min-h-0 flex-1 grid-cols-[.72fr_1.28fr] gap-[clamp(18px,2.2vw,34px)]"><article className="flex min-h-0 flex-col items-center justify-center rounded-[2.5rem] border border-white/15 bg-white/10 p-[clamp(20px,2.2vw,36px)] text-center shadow-2xl backdrop-blur"><div className="grid h-[clamp(210px,20vw,300px)] w-[clamp(210px,20vw,300px)] place-items-center rounded-full border-[clamp(14px,1.4vw,22px)] bg-slate-950/20 shadow-[0_0_60px_rgba(0,0,0,.2)]" style={{ borderColor: colorNps }}><div><span className="block text-sm font-extrabold uppercase tracking-[.2em] text-white/60">NPS total</span><strong data-testid="nps-total" className="mt-1 block font-display text-[clamp(72px,7vw,108px)] font-extrabold leading-none" style={{ color: colorNps }}>{nps === null ? "—" : nps > 0 ? `+${nps}` : nps}</strong><span className="mt-2 block text-sm font-bold text-white/55">{satisfaccion.respuestasNps} respuestas</span></div></div><div className="mt-6 grid w-full grid-cols-3 gap-2"><div className="rounded-2xl bg-[var(--epm-verde)]/15 p-3"><strong className="block text-2xl text-[var(--epm-verde)]">{porcentaje(satisfaccion.promotores)}%</strong><span className="text-xs font-bold text-white/60">promotores</span></div><div className="rounded-2xl bg-amber-300/15 p-3"><strong className="block text-2xl text-amber-300">{porcentaje(satisfaccion.pasivos)}%</strong><span className="text-xs font-bold text-white/60">pasivos</span></div><div className="rounded-2xl bg-rose-400/15 p-3"><strong className="block text-2xl text-rose-300">{porcentaje(satisfaccion.detractores)}%</strong><span className="text-xs font-bold text-white/60">detractores</span></div></div><p className="mt-4 text-xs text-white/45">NPS = % de promotores − % de detractores, sobre respuestas de 0 a 10.</p></article><div data-testid="comentarios-satisfaccion" className="grid min-h-0 grid-cols-2 grid-rows-3 gap-[clamp(10px,1.2vw,17px)]">{comentarios.length ? comentarios.map((comentario, indice) => <blockquote key={`${pagina}-${comentario}`} className="miniatura-cifra-animada relative flex min-h-0 items-center overflow-hidden rounded-[clamp(18px,1.5vw,25px)] border border-white/15 bg-white/10 px-[clamp(16px,1.4vw,24px)] py-3 shadow-xl backdrop-blur" style={{ animation: `miniatura-cifra-entrada .55s ${indice * .09}s ease-out both` }}><MessageCircleHeart className="mr-3 shrink-0 text-[var(--epm-verde)]" size={34} /><p className="line-clamp-4 font-display text-[clamp(15px,1.15vw,20px)] font-bold leading-snug text-white/90">“{comentario}”</p></blockquote>) : <div className="col-span-2 row-span-3 grid place-items-center rounded-[2.5rem] border border-white/15 bg-white/10 p-10 text-center"><div><MessageCircleHeart className="mx-auto text-[var(--epm-verde)]" size={68} /><p className="mt-5 text-2xl font-bold text-white/70">Los comentarios positivos aparecerán aquí cuando existan respuestas disponibles.</p></div></div>}</div></div></section>;
}

function ReflexionTecnologia() {
  const nodos = ["Personas", "Conversaciones", "Empresas", "Aprendizajes"];
  return <section className="grid h-full place-items-center text-center"><div className="max-w-6xl"><div className="relative mx-auto grid h-[clamp(170px,19vw,240px)] w-[clamp(170px,19vw,240px)] place-items-center"><div className="absolute inset-0 rounded-full border border-[var(--epm-verde)]/25" /><div className="absolute inset-[15%] rounded-full border border-white/15" /><div className="nodo-conexion-animado relative z-10 grid h-[clamp(88px,9vw,120px)] w-[clamp(88px,9vw,120px)] place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-[0_0_70px_rgba(140,198,63,.4)]" style={{ animation: "nodo-conexion 2.6s ease-in-out infinite" }}><Network size={54} /></div>{nodos.map((nodo, indice) => { const posiciones = ["left-[-30%] top-[38%]", "right-[-40%] top-[38%]", "left-[25%] top-[-18%]", "left-[25%] bottom-[2%]"]; return <span key={nodo} className={`absolute ${posiciones[indice]} rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold backdrop-blur`}>{nodo}</span>; })}</div><p className="mt-8 font-extrabold uppercase tracking-[.22em] text-[var(--epm-verde)]">Una reflexión para continuar</p><h2 className="mx-auto mt-4 max-w-5xl font-display text-[clamp(42px,5.6vw,80px)] font-extrabold leading-[.96]">La tecnología cobra sentido cuando <span className="text-[var(--epm-verde)]">nos acerca.</span></h2><p className="mx-auto mt-7 max-w-4xl text-[clamp(18px,1.8vw,27px)] leading-relaxed text-white/70">No fue solo una app: fue un puente para unir personas, multiplicar conversaciones y movilizarnos alrededor de un mismo objetivo.</p></div></section>;
}

function Cierre({ datos }: { datos: DatosResumenEvento }) {
  return <section className="grid h-full place-items-center overflow-hidden pb-[clamp(84px,10vh,108px)] text-center"><div className="max-w-6xl"><div className="mx-auto grid h-[clamp(68px,7vh,84px)] w-[clamp(68px,7vh,84px)] place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-[0_0_70px_rgba(140,198,63,.45)]"><Sparkles size={40} /></div><p className="mt-5 font-extrabold uppercase tracking-[.24em] text-[var(--epm-verde)]">Gracias por hacerlo posible</p><h2 className="mt-3 font-display text-[clamp(42px,5.2vw,78px)] font-extrabold leading-[.92]">Cada cifra tiene una historia.<br /><span className="text-[var(--epm-verde)]">Cada foto, una conexión.</span></h2><p data-testid="texto-cierre" className="mx-auto mt-5 max-w-3xl text-[clamp(16px,1.45vw,23px)] leading-snug text-white/65">{datos.nombreEvento} termina, pero lo que construimos juntos continúa.</p><div data-testid="distintivo-cierre" className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-bold backdrop-blur"><Images size={22} className="text-[var(--epm-verde)]" /> {datos.cifras.recuerdos.toLocaleString("es-CO")} recuerdos para volver a este momento</div></div></section>;
}
