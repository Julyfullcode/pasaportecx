"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Music,
  Pause,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
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
  empresas: { nombre: string; participantes: number }[];
  podio: { id: string; nombre: string; urlFoto: string; puntosTotales: number; empresa: { nombre: string } }[];
  fotos: FotoResumen[];
};

type Diapositiva =
  | { tipo: "portada"; duracion: number }
  | { tipo: "cifras"; duracion: number }
  | { tipo: "participacion"; duracion: number }
  | { tipo: "empresas"; duracion: number }
  | { tipo: "fotos"; duracion: number; fotos: FotoResumen[]; tanda: number }
  | { tipo: "podio"; duracion: number }
  | { tipo: "cierre"; duracion: number };

const PALETA = ["#3fa9e0", "#8cc63f", "#12b886", "#f7c948", "#f78c6b", "#a78bfa", "#38bdf8", "#fb7185"];

function agrupar<T>(valores: T[], tamano: number) {
  const grupos: T[][] = [];
  for (let indice = 0; indice < valores.length; indice += tamano) grupos.push(valores.slice(indice, indice + tamano));
  return grupos;
}

function useMusicaAmbiental() {
  const motor = useRef<{ contexto: AudioContext; ganancia: GainNode; temporizador: number; paso: number } | null>(null);
  const [activa, setActiva] = useState(false);

  const iniciar = useCallback(() => {
    if (motor.current) {
      void motor.current.contexto.resume();
      motor.current.ganancia.gain.setTargetAtTime(0.11, motor.current.contexto.currentTime, 0.3);
      setActiva(true);
      return;
    }
    const contexto = new AudioContext();
    const ganancia = contexto.createGain();
    ganancia.gain.setValueAtTime(0.0001, contexto.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.11, contexto.currentTime + 1.5);
    ganancia.connect(contexto.destination);
    const notas = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
    const tocar = (frecuencia: number, duracion = 1.7, volumen = 0.16, tipo: OscillatorType = "sine") => {
      const ahora = contexto.currentTime;
      const oscilador = contexto.createOscillator();
      const envolvente = contexto.createGain();
      oscilador.type = tipo;
      oscilador.frequency.setValueAtTime(frecuencia, ahora);
      envolvente.gain.setValueAtTime(0.0001, ahora);
      envolvente.gain.exponentialRampToValueAtTime(volumen, ahora + 0.09);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);
      oscilador.connect(envolvente);
      envolvente.connect(ganancia);
      oscilador.start(ahora);
      oscilador.stop(ahora + duracion + 0.05);
    };
    const estado = { contexto, ganancia, temporizador: 0, paso: 0 };
    const pulso = () => {
      tocar(notas[estado.paso % notas.length]);
      if (estado.paso % 4 === 0) tocar(notas[estado.paso % notas.length] / 2, 3.2, 0.08, "triangle");
      estado.paso += 1;
    };
    pulso();
    estado.temporizador = window.setInterval(pulso, 780);
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
      actual.ganancia.gain.setTargetAtTime(0.11, actual.contexto.currentTime, 0.22);
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
    const fotos = agrupar(datos.fotos, 8).map((grupo, indice) => ({
      tipo: "fotos" as const,
      duracion: 11_000,
      fotos: grupo,
      tanda: indice + 1,
    }));
    return [
      { tipo: "portada", duracion: 8_000 },
      { tipo: "cifras", duracion: 10_000 },
      { tipo: "participacion", duracion: 10_000 },
      { tipo: "empresas", duracion: 10_000 },
      ...fotos,
      ...(datos.podio.length ? [{ tipo: "podio" as const, duracion: 11_000 }] : []),
      { tipo: "cierre", duracion: 12_000 },
    ];
  }, [datos.fotos, datos.podio.length]);
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
        {actual.tipo === "participacion" && <Participacion datos={datos} />}
        {actual.tipo === "empresas" && <Empresas empresas={datos.empresas} total={datos.cifras.participantes} />}
        {actual.tipo === "fotos" && <Fotos fotos={actual.fotos} tanda={actual.tanda} total={Math.ceil(datos.fotos.length / 8)} />}
        {actual.tipo === "podio" && <PodioResumen personas={datos.podio} />}
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
    </main>
  );
}

function Titulo({ etiqueta, titulo, descripcion }: { etiqueta: string; titulo: string; descripcion?: string }) {
  return <div className="mb-[clamp(18px,3vh,34px)]"><p className="font-extrabold uppercase tracking-[.2em] text-[var(--epm-verde)]">{etiqueta}</p><h2 className="mt-2 font-display text-[clamp(34px,4.5vw,68px)] font-extrabold leading-none">{titulo}</h2>{descripcion && <p className="mt-3 max-w-4xl text-[clamp(15px,1.35vw,21px)] text-white/65">{descripcion}</p>}</div>;
}

function Portada({ nombre }: { nombre: string }) {
  return <section className="grid h-full place-items-center text-center"><div><div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 font-extrabold text-[var(--epm-verde)] backdrop-blur"><Sparkles size={21} /> Lo que vivimos juntos</div><h1 className="mx-auto mt-8 max-w-6xl font-display text-[clamp(50px,8vw,118px)] font-extrabold leading-[.9]"><span className="text-[var(--epm-verde)]">{nombre}</span><br />en cifras y recuerdos</h1><p className="mt-8 text-[clamp(18px,2vw,30px)] text-white/65">Personas, conversaciones y momentos que dejan huella.</p></div></section>;
}

function TarjetaCifra({ valor, etiqueta, Icono, color }: { valor: number; etiqueta: string; Icono: typeof Users; color: string }) {
  return <article className="relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[clamp(22px,2.2vw,34px)] border border-white/15 bg-white/10 p-[clamp(18px,2vw,32px)] shadow-2xl backdrop-blur"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl" style={{ background: color }} /><span className="grid h-[clamp(44px,4vw,64px)] w-[clamp(44px,4vw,64px)] place-items-center rounded-2xl text-[var(--epm-azul-profundo)] shadow-lg" style={{ background: color }}><Icono size={28} /></span><div><strong className="font-display text-[clamp(46px,6vw,90px)] font-extrabold leading-none">{valor.toLocaleString("es-CO")}</strong><p className="mt-3 text-[clamp(14px,1.3vw,21px)] font-bold text-white/65">{etiqueta}</p></div></article>;
}

function Cifras({ datos }: { datos: DatosResumenEvento }) {
  const cifras = [
    { valor: datos.cifras.participantes, etiqueta: "personas hicieron parte", Icono: Users, color: "#8cc63f" },
    { valor: datos.cifras.empresas, etiqueta: "empresas conectadas", Icono: Building2, color: "#3fa9e0" },
    { valor: datos.cifras.desafios, etiqueta: "desafíos del recorrido", Icono: Target, color: "#f7c948" },
    { valor: datos.cifras.recuerdos, etiqueta: "momentos compartidos", Icono: Camera, color: "#fb7185" },
  ];
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="El encuentro" titulo="Una experiencia construida entre todos" descripcion={`${datos.cifras.staff.toLocaleString("es-CO")} integrantes del equipo Staff acompañaron la experiencia.`} /><div className="grid min-h-0 flex-1 grid-cols-4 gap-[clamp(12px,1.8vw,26px)]">{cifras.map((cifra) => <TarjetaCifra key={cifra.etiqueta} {...cifra} />)}</div></section>;
}

function Participacion({ datos }: { datos: DatosResumenEvento }) {
  const porcentaje = datos.cifras.participantes ? Math.round(datos.cifras.participantesConDesafios * 100 / datos.cifras.participantes) : 0;
  const items = [
    { valor: datos.cifras.completitudes, etiqueta: "desafíos completados", Icono: CheckCircle2, color: "#8cc63f" },
    { valor: datos.cifras.puntos, etiqueta: "puntos acumulados", Icono: Trophy, color: "#f7c948" },
    { valor: datos.cifras.participacionesActividad + datos.cifras.resultadosJuego, etiqueta: "participaciones en actividades", Icono: Award, color: "#3fa9e0" },
    { valor: datos.cifras.reacciones, etiqueta: "reacciones a los recuerdos", Icono: Heart, color: "#fb7185" },
  ];
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Participación" titulo="La experiencia se puso en movimiento" /><div className="grid min-h-0 flex-1 grid-cols-[.72fr_1.28fr] gap-[clamp(16px,2.5vw,38px)]"><article className="grid place-items-center rounded-[2.5rem] border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur"><div><div className="relative mx-auto grid h-[clamp(220px,27vw,350px)] w-[clamp(220px,27vw,350px)] place-items-center rounded-full" style={{ background: `conic-gradient(var(--epm-verde) ${porcentaje}%, rgba(255,255,255,.13) 0)` }}><div className="absolute inset-5 rounded-full bg-[var(--epm-azul-profundo)]/95" /><strong className="relative font-display text-[clamp(58px,7vw,104px)] font-extrabold">{porcentaje}%</strong></div><p className="mt-5 text-xl font-bold text-white/70">participó en al menos un desafío</p></div></article><div className="grid grid-cols-2 gap-[clamp(12px,1.7vw,24px)]">{items.map((item) => <TarjetaCifra key={item.etiqueta} {...item} />)}</div></div></section>;
}

function Empresas({ empresas, total }: { empresas: DatosResumenEvento["empresas"]; total: number }) {
  const maximo = Math.max(1, ...empresas.map((empresa) => empresa.participantes));
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Conexiones" titulo="Un solo equipo, muchas voces" descripcion={`${empresas.length} empresas representadas en el encuentro.`} /><div className="grid min-h-0 flex-1 grid-cols-2 gap-x-10 gap-y-3 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-[clamp(20px,2.3vw,36px)] backdrop-blur">{empresas.map((empresa, indice) => <div key={empresa.nombre} className="flex min-h-0 flex-col justify-center"><div className="mb-2 flex items-end justify-between gap-3"><strong className="truncate text-[clamp(13px,1.2vw,19px)]">{empresa.nombre}</strong><span className="font-display text-xl font-extrabold text-[var(--epm-verde)]">{empresa.participantes}</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(5, empresa.participantes * 100 / maximo)}%`, background: PALETA[indice % PALETA.length] }} /></div></div>)}</div><p className="mt-3 text-right text-sm text-white/50">{total.toLocaleString("es-CO")} participantes en total</p></section>;
}

function Fotos({ fotos, tanda, total }: { fotos: FotoResumen[]; tanda: number; total: number }) {
  const estructura = fotos.length === 1 ? "grid-cols-1 grid-rows-1" : fotos.length === 2 ? "grid-cols-2 grid-rows-1" : fotos.length <= 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-4 grid-rows-2";
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta={`Momentos ${tanda} de ${total}`} titulo="Imágenes que cuentan nuestra historia" /><div className={`grid min-h-0 flex-1 ${estructura} gap-[clamp(9px,1.2vw,18px)]`}>{fotos.map((foto, indice) => <figure key={foto.id} className={`relative min-h-0 overflow-hidden rounded-[clamp(18px,1.8vw,28px)] bg-slate-950 shadow-2xl ${fotos.length === 3 && indice === 0 ? "row-span-2" : ""}`}><img src={foto.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" /><img src={foto.url} alt={foto.texto || `Momento compartido por ${foto.autoria}`} className="relative z-[1] h-full w-full object-contain" /><figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-4 pt-12"><p className="line-clamp-2 text-[clamp(11px,1vw,16px)] font-bold">{foto.texto || "Un momento para recordar"}</p><div className="mt-1 flex justify-between gap-2 text-[clamp(10px,.85vw,13px)] text-white/65"><span className="truncate">{foto.autoria}</span>{foto.reacciones > 0 && <span className="shrink-0">♥ {foto.reacciones}</span>}</div></figcaption></figure>)}</div></section>;
}

function PodioResumen({ personas }: { personas: DatosResumenEvento["podio"] }) {
  const orden = [personas[1], personas[0], personas[2]].filter(Boolean);
  return <section className="flex h-full min-h-0 flex-col"><Titulo etiqueta="Reconocimiento" titulo="Personas que dejaron huella" /><div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-[clamp(16px,2.2vw,34px)]">{orden.map((persona) => { const puesto = personas.findIndex((item) => item.id === persona.id) + 1; const primero = puesto === 1; return <article key={persona.id} className={`relative flex min-h-0 flex-col items-center justify-center rounded-[2.4rem] border p-6 text-center shadow-2xl backdrop-blur ${primero ? "h-full border-amber-300 bg-amber-300/20" : "h-[88%] border-white/15 bg-white/10"}`}><span className={`absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full font-display text-2xl font-extrabold ${primero ? "bg-amber-300 text-amber-950" : "bg-white/15"}`}>{puesto}</span>{primero ? <Medal className="mb-3 text-amber-300" size={38} /> : <Award className="mb-3 text-[var(--epm-verde)]" size={34} />}<FotoCircular src={persona.urlFoto} alt={`Foto de ${persona.nombre}`} className={`${primero ? "h-[clamp(170px,22vh,280px)] w-[clamp(170px,22vh,280px)]" : "h-[clamp(145px,19vh,235px)] w-[clamp(145px,19vh,235px)]"} border-4`} /><h3 className="mt-5 text-[clamp(21px,2.2vw,35px)] font-extrabold leading-tight">{persona.nombre}</h3><p className="mt-2 text-white/60">{persona.empresa.nombre}</p><strong className={`mt-5 font-display text-[clamp(38px,4vw,64px)] ${primero ? "text-amber-300" : "text-[var(--epm-verde)]"}`}>{persona.puntosTotales.toLocaleString("es-CO")} <small className="text-[.35em] text-white/60">pts</small></strong></article>; })}</div></section>;
}

function Cierre({ datos }: { datos: DatosResumenEvento }) {
  return <section className="grid h-full place-items-center text-center"><div className="max-w-6xl"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[var(--epm-verde)] text-[var(--epm-azul-profundo)] shadow-[0_0_70px_rgba(140,198,63,.45)]"><Sparkles size={48} /></div><p className="mt-8 font-extrabold uppercase tracking-[.24em] text-[var(--epm-verde)]">Gracias por hacerlo posible</p><h2 className="mt-4 font-display text-[clamp(48px,7vw,104px)] font-extrabold leading-[.94]">Cada cifra tiene una historia.<br /><span className="text-[var(--epm-verde)]">Cada foto, una conexión.</span></h2><p className="mx-auto mt-7 max-w-3xl text-[clamp(18px,1.8vw,28px)] text-white/65">{datos.nombreEvento} termina, pero lo que construimos juntos continúa.</p><div className="mx-auto mt-9 flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-bold backdrop-blur"><Images size={22} className="text-[var(--epm-verde)]" /> {datos.cifras.recuerdos.toLocaleString("es-CO")} recuerdos para volver a este momento</div></div></section>;
}
