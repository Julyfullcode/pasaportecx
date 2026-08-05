import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const empresas = [
  "EPM",
  "CENS",
  "EDEQ",
  "CHEC",
  "Afinia",
  "Emvarias",
  "EEGSA",
  "ENSA",
  "Enérgica",
  "Comegsa",
  "SOMOS",
  "Aguas de Malambo",
  "Aguas de Antofagasta",
  "Aguas Regionales",
];

const componentes = [
  ["Más Digital", "#0079C2"],
  ["Diseño", "#8CC63F"],
  ["Conocimiento", "#0E7C6E"],
  ["Eficiencias", "#0B3B60"],
  ["Cultura y gobernanza", "#2E9E5B"],
] as const;

const coloresAvatares = [
  "#0079C2",
  "#E57A24",
  "#0E7C6E",
  "#7B4AB5",
  "#D13F67",
  "#2E9E5B",
];

const nombres = [
  "Ana María Torres",
  "Carlos Andrés Mejía",
  "Sofía Restrepo",
  "Juan Pablo Díaz",
  "Valentina Gómez",
  "Mateo Ramírez",
  "Mariana López",
  "Sebastián Rojas",
  "Isabella Martínez",
  "Samuel Herrera",
  "Camila Castro",
  "Nicolás Vélez",
  "Luciana Ortiz",
  "Tomás Arango",
  "Gabriela Ruiz",
  "Martín Salazar",
  "Emilia Jaramillo",
  "Daniel Cárdenas",
];

function avatarSvg(iniciales: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#0B3B60"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="300" cy="235" r="115" fill="#fff" opacity=".88"/><path d="M92 600c16-151 91-225 208-225s192 74 208 225" fill="#fff" opacity=".88"/><text x="300" y="560" font-family="Arial" font-size="46" text-anchor="middle" fill="#0B3B60" font-weight="700">${iniciales}</text></svg>`;
}

function recuerdoSvg(indice: number) {
  const paletas = [
    ["#0B3B60", "#0E7C6E", "#8CC63F"],
    ["#0079C2", "#3FA9E0", "#0E7C6E"],
    ["#2E9E5B", "#8CC63F", "#0B3B60"],
  ];
  const [a, b, c] = paletas[indice % paletas.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="1200" height="900" rx="40" fill="url(#g)"/><circle cx="${180 + (indice % 4) * 230}" cy="270" r="120" fill="#fff" opacity=".2"/><circle cx="${380 + (indice % 3) * 250}" cy="490" r="180" fill="none" stroke="#fff" stroke-width="12" opacity=".25"/><path d="M0 ${660 - indice * 7} Q300 520 600 680T1200 620V900H0Z" fill="#fff" opacity=".17"/><text x="70" y="810" fill="#fff" font-family="Arial" font-size="54" font-weight="700">Momento CX · ${String(indice + 1).padStart(2, "0")}</text></svg>`;
}

async function crearImagenes() {
  const raiz = path.join(process.cwd(), "uploads", "seed");
  await mkdir(raiz, { recursive: true });
  for (let i = 0; i < nombres.length; i++) {
    const iniciales = nombres[i].split(" ").slice(0, 2).map((p) => p[0]).join("");
    await writeFile(path.join(raiz, `avatar-${i + 1}.svg`), avatarSvg(iniciales, coloresAvatares[i % 6]));
  }
  for (let i = 0; i < 12; i++) {
    await writeFile(path.join(raiz, `recuerdo-${i + 1}.svg`), recuerdoSvg(i));
  }
}

async function main() {
  await prisma.sesionParticipante.deleteMany();
  await prisma.sesionAdmin.deleteMany();
  await prisma.correoAutorizado.deleteMany();
  await prisma.completitud.deleteMany();
  await prisma.recuerdo.deleteMany();
  await prisma.ajustePuntos.deleteMany();
  await prisma.desafio.deleteMany();
  await prisma.participante.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.componente.deleteMany();
  await prisma.ubicacion.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.configuracionEvento.deleteMany();

  await crearImagenes();

  const empresasCreadas = await Promise.all(
    empresas.map((nombre, indice) =>
      prisma.empresa.create({ data: { nombre, orden: indice + 1 } }),
    ),
  );
  const componentesCreados = await Promise.all(
    componentes.map(([nombre, colorHex], indice) =>
      prisma.componente.create({ data: { nombre, colorHex, orden: indice + 1 } }),
    ),
  );
  await Promise.all(
    ["Auditorio", "Registro", "Coffee break", "Salida nocturna centro de Medellín"].map(
      (nombre, indice) => prisma.ubicacion.create({ data: { nombre, orden: indice + 1 } }),
    ),
  );
  await prisma.configuracionEvento.create({
    data: {
      id: "evento",
      nombreEvento: "Pasaporte CX · Encuentro Grupo EPM",
      tamanoPodioIndividual: 5,
    },
  });
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Cambiar123!";
  await prisma.admin.create({
    data: {
      usuario: process.env.ADMIN_USER ?? "admin",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const desafiosData = [
    {
      codigoQr: "bienvenida-cx",
      titulo: "Bienvenida al encuentro",
      descripcion: "Registra tu llegada al auditorio.",
      tipo: "CHECK_IN" as const,
      puntos: 100,
      dia: 1,
      ubicacion: "Registro",
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: {},
    },
    {
      codigoQr: "pregunta-cliente",
      titulo: "La voz del cliente",
      descripcion: "Selecciona los elementos que hacen parte de una escucha activa.",
      tipo: "OPCION_MULTIPLE" as const,
      puntos: 180,
      dia: 1,
      ubicacion: "Auditorio",
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: {
        opciones: [
          { id: "a", texto: "Empatía", correcta: true },
          { id: "b", texto: "Suposiciones", correcta: false },
          { id: "c", texto: "Preguntas abiertas", correcta: true },
        ],
        multiple: true,
        puntajeParcial: true,
      },
    },
    {
      codigoQr: "clave-experiencia",
      titulo: "Una palabra que nos conecta",
      descripcion: "Descubre la palabra clave de la conferencia.",
      tipo: "RESPUESTA_ABIERTA" as const,
      puntos: 150,
      dia: 1,
      ubicacion: "Coffee break",
      estado: "PUBLICADO" as const,
      esSecreto: true,
      configuracion: { respuestasAceptadas: ["experiencia", "la experiencia"] },
    },
    {
      codigoQr: "medellin-nocturna",
      titulo: "Medellín se ilumina",
      descripcion: "Comparte una foto creativa durante la salida nocturna.",
      tipo: "EVIDENCIA_FOTO" as const,
      puntos: 250,
      dia: 1,
      ubicacion: "Salida nocturna centro de Medellín",
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: { instruccion: "Toma una foto donde aparezcan al menos tres integrantes." },
    },
    {
      codigoQr: "estacion-digital",
      titulo: "Futuro más digital",
      descripcion: "Completa la actividad de la estación.",
      tipo: "CHECK_IN" as const,
      puntos: 220,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[0].id,
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: {},
    },
    {
      codigoQr: "estacion-diseno",
      titulo: "Diseña con propósito",
      descripcion: "Elige el principio esencial del diseño centrado en personas.",
      tipo: "OPCION_MULTIPLE" as const,
      puntos: 240,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[1].id,
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: {
        opciones: [
          { id: "a", texto: "Validar con usuarios", correcta: true },
          { id: "b", texto: "Decidir sin investigar", correcta: false },
        ],
        multiple: false,
        puntajeParcial: false,
      },
    },
    {
      codigoQr: "estacion-conocimiento",
      titulo: "Conocimiento compartido",
      descripcion: "Escribe la clave encontrada en la estación.",
      tipo: "RESPUESTA_ABIERTA" as const,
      puntos: 200,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[2].id,
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: { respuestasAceptadas: ["aprendizaje continuo", "aprendizaje"] },
    },
    {
      codigoQr: "estacion-eficiencias",
      titulo: "Eficiencias que suman",
      descripcion: "Cuéntanos cuál mejora implementarías primero.",
      tipo: "ENCUESTA" as const,
      puntos: 120,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[3].id,
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: { pregunta: "¿Cuál mejora implementarías primero?", formato: "texto" },
    },
    {
      codigoQr: "estacion-cultura",
      titulo: "Cultura que inspira",
      descripcion: "Captura una evidencia de colaboración.",
      tipo: "EVIDENCIA_FOTO" as const,
      puntos: 260,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[4].id,
      estado: "PUBLICADO" as const,
      esSecreto: false,
      configuracion: { instruccion: "Fotografía el resultado construido por tu mesa." },
    },
    {
      codigoQr: "prototipo-digital",
      titulo: "Prototipo relámpago",
      descripcion: "Reto adicional listo para publicar cuando la organización lo decida.",
      tipo: "ENCUESTA" as const,
      puntos: 300,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[0].id,
      estado: "BORRADOR" as const,
      esSecreto: false,
      configuracion: { pregunta: "Califica el prototipo de 1 a 5", formato: "escala" },
    },
    {
      codigoQr: "cierre-cosecha-gratitud-celebracion",
      titulo: "Cierre: Cosecha, gratitud y celebración",
      descripcion: "Recoge lo vivido en el encuentro: un aprendizaje, un agradecimiento y una acción para impulsar al regresar.",
      tipo: "ENCUESTA" as const,
      puntos: 150,
      dia: 2,
      ubicacion: "",
      componenteId: componentesCreados[0].id,
      estado: "BORRADOR" as const,
      esSecreto: false,
      configuracion: {
        formato: "cosecha",
        preguntas: [
          { id: "meLlevo", titulo: "Me llevo", ayuda: "Una idea o aprendizaje." },
          { id: "agradezco", titulo: "Agradezco", ayuda: "Una persona, conversación o práctica." },
          { id: "activo", titulo: "Activo", ayuda: "Una acción que quisiera impulsar al regresar." },
        ],
      },
    },
  ];
  const desafios = [];
  for (const desafio of desafiosData) {
    desafios.push(await prisma.desafio.create({ data: desafio }));
  }

  const participantes = [];
  for (let i = 0; i < nombres.length; i++) {
    participantes.push(
      await prisma.participante.create({
        data: {
          nombre: nombres[i],
          empresaId: empresasCreadas[i % empresasCreadas.length].id,
          urlFoto: `/uploads/seed/avatar-${i + 1}.svg`,
          codigoRecuperacion: `CX${String(i + 1).padStart(4, "0")}`,
        },
      }),
    );
  }

  for (let i = 0; i < participantes.length; i++) {
    const cantidad = 1 + (i % 6);
    let puntos = 0;
    for (let j = 0; j < cantidad; j++) {
      const desafio = desafios[j];
      const otorgados = desafio.puntos - (j === 1 && i % 3 === 0 ? 60 : 0);
      await prisma.completitud.create({
        data: {
          participanteId: participantes[i].id,
          desafioId: desafio.id,
          puntosOtorgados: otorgados,
          estado: "APROBADO",
          respuesta: { seed: true },
        },
      });
      puntos += otorgados;
    }
    await prisma.participante.update({
      where: { id: participantes[i].id },
      data: { puntosTotales: puntos },
    });
  }

  for (let i = 0; i < 12; i++) {
    await prisma.recuerdo.create({
      data: {
        participanteId: participantes[i].id,
        urlFoto: `/uploads/seed/recuerdo-${i + 1}.svg`,
        urlMiniatura: `/uploads/seed/recuerdo-${i + 1}.svg`,
        descripcion: ["Conectando ideas", "Muchas miradas", "Experiencias que dejan huella"][i % 3],
      },
    });
  }
}

main()
  .then(() => console.log("Seed completo: catálogos, 18 participantes, 10 desafíos y 12 recuerdos."))
  .finally(() => prisma.$disconnect());
