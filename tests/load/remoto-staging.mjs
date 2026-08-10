import https from "node:https";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const HOST = "pasaportecx-git-load-test-staging-juligiraldo-3715s-projects.vercel.app";
const IP = process.env.LOAD_TEST_IP;
const CLAVE = process.env.LOAD_TEST_KEY;
const RUN_ID = `evt-${Date.now().toString(36)}`;
const REGISTROS = Number(process.env.LOAD_REGISTRATIONS ?? 120);
const RAMPA_MS = Number(process.env.LOAD_RAMP_MS ?? 12 * 60_000);
if (!IP || !CLAVE) throw new Error("Faltan LOAD_TEST_IP o LOAD_TEST_KEY");
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const agente = new https.Agent({ keepAlive: true, maxSockets: 180, lookup: (_host, _options, callback) => callback(null, IP, 4) });
const reportes = [];

function dormir(ms) { return new Promise((resolver) => setTimeout(resolver, ms)); }
function percentil(valores, porcentaje) { const ordenados=[...valores].sort((a,b)=>a-b); return ordenados[Math.max(0,Math.ceil(ordenados.length*porcentaje)-1)] ?? 0; }
function reporte(nombre, muestras, duracionMs) {
  const tiempos=muestras.map((m)=>m.ms);
  const errores=muestras.filter((m)=>m.error || m.status>=400);
  const item={ escenario:nombre, solicitudes:muestras.length, duracionSegundos:Number((duracionMs/1000).toFixed(2)), avgMs:Number((tiempos.reduce((a,b)=>a+b,0)/Math.max(1,tiempos.length)).toFixed(2)), p95Ms:Number(percentil(tiempos,.95).toFixed(2)), p99Ms:Number(percentil(tiempos,.99).toFixed(2)), throughputRps:Number((muestras.length/Math.max(.001,duracionMs/1000)).toFixed(2)), errores:{ total:errores.length, tasaPorcentaje:Number((errores.length/Math.max(1,muestras.length)*100).toFixed(2)), http4xx:errores.filter((m)=>m.status>=400&&m.status<500).length, http5xx:errores.filter((m)=>m.status>=500).length, timeouts:errores.filter((m)=>m.timeout).length, detalles:errores.slice(0,8).map((m)=>m.error || `HTTP ${m.status}`) } };
  reportes.push(item); console.log(JSON.stringify(item)); return item;
}

function solicitar({ method="GET", path="/", headers={}, body, timeoutMs=30_000 }) {
  return new Promise((resolver) => {
    const inicio=performance.now();
    const req=https.request({ hostname:HOST, servername:HOST, port:443, path, method, agent:agente, headers:{ Host:HOST, ...headers } }, (res)=>{
      const partes=[]; res.on("data",(p)=>partes.push(p)); res.on("end",()=>{
        const datos=Buffer.concat(partes); resolver({ status:res.statusCode??0, headers:res.headers, body:datos, text:datos.toString("utf8"), ms:performance.now()-inicio });
      });
    });
    req.setTimeout(timeoutMs,()=>req.destroy(Object.assign(new Error("timeout"),{timeout:true})));
    req.on("error",(error)=>resolver({ status:0, headers:{}, body:Buffer.alloc(0), text:"", ms:performance.now()-inicio, timeout:Boolean(error.timeout), error:error.message }));
    if(body) req.write(body); req.end();
  });
}

function jsonBody(valor) { const body=Buffer.from(JSON.stringify(valor)); return { body, headers:{ "Content-Type":"application/json", "Content-Length":body.length } }; }
async function control(accion, extra={}) {
  const carga=jsonBody({ accion, runId:RUN_ID, ...extra });
  const respuesta=await solicitar({ method:"POST", path:"/api/test-carga", headers:{ ...carga.headers, "x-load-test-key":CLAVE }, body:carga.body, timeoutMs:60_000 });
  if(respuesta.status!==200) throw new Error(`Control ${accion} falló HTTP ${respuesta.status}: ${respuesta.text.slice(0,300)}`);
  return JSON.parse(respuesta.text);
}

function multipart(campos, archivo) {
  const boundary=`----pasaporte${randomBytes(12).toString("hex")}`;
  const partes=[];
  for(const [nombre,valor] of Object.entries(campos)) partes.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${nombre}"\r\n\r\n${valor}\r\n`));
  if(archivo){ partes.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${archivo.campo}"; filename="${archivo.nombre}"\r\nContent-Type: ${archivo.tipo}\r\n\r\n`)); partes.push(archivo.datos); partes.push(Buffer.from("\r\n")); }
  partes.push(Buffer.from(`--${boundary}--\r\n`));
  const body=Buffer.concat(partes); return { body, headers:{ "Content-Type":`multipart/form-data; boundary=${boundary}`, "Content-Length":body.length } };
}
function cookie(respuesta){ const valor=Array.isArray(respuesta.headers["set-cookie"])?respuesta.headers["set-cookie"][0]:respuesta.headers["set-cookie"]??""; return valor.match(/pasaporte_participante=([^;]+)/)?.[1] ? `pasaporte_participante=${valor.match(/pasaporte_participante=([^;]+)/)[1]}` : ""; }
async function programar(total,ventanaMs,tarea){const inicio=performance.now();await Promise.all(Array.from({length:total},async(_,i)=>{const objetivo=total<=1?0:ventanaMs*i/(total-1);await dormir(Math.max(0,objetivo-(performance.now()-inicio)));await tarea(i);}));return performance.now()-inicio;}
async function completar(cookieSesion,codigo){return solicitar({method:"POST",path:`/api/desafios/${encodeURIComponent(codigo)}/completar`,headers:{Cookie:cookieSesion}});}

let preparado=false;
try {
  if(!IP) throw new Error("Falta LOAD_TEST_IP");
  const estado=await control("estado");
  if(estado.entorno!=="preview"||estado.rama!=="load-test-staging") throw new Error(`Destino inseguro: ${JSON.stringify(estado)}`);
  const datos=await control("preparar",{cantidad:REGISTROS}); preparado=true;
  console.log(`Preparado ${RUN_ID}: ${REGISTROS} correos sintéticos`);
  const usuarios=[]; const muestrasRegistro=[]; const muestrasRanking=[]; let detener=false;
  const polling=(async()=>{while(!detener){const r=await solicitar({path:"/api/ranking",headers:{Cookie:datos.cookieMonitor}});let error=r.error;if(!error&&r.status===200){try{const cuerpo=JSON.parse(r.text);if(!Array.isArray(cuerpo.individual))error="Ranking sin colección";else if(cuerpo.individual.some((p,i)=>i>0&&cuerpo.individual[i-1].puntosTotales<p.puntosTotales))error="Ranking desordenado";else if(new Set(cuerpo.individual.map((p)=>p.id)).size!==cuerpo.individual.length)error="Ranking duplicado";}catch{error="Ranking inválido";}}muestrasRanking.push({...r,error});await dormir(3000+Math.random()*2000);}})();

  const duracionRegistro=await programar(REGISTROS,RAMPA_MS,async(i)=>{
    const carga=multipart({correo:datos.correos[i],nombres:`Carga ${RUN_ID}`,apellidos:`Persona ${i}`,empresaId:datos.empresaId,aceptaDatos:"on"},{campo:"foto",nombre:"perfil.png",tipo:"image/png",datos:FOTO});
    const r=await solicitar({method:"POST",path:"/api/registro",headers:carga.headers,body:carga.body});
    let error=r.error; const sesion=cookie(r); if(!error&&(r.status!==200||!sesion))error=`Registro HTTP ${r.status} sin cookie`;
    muestrasRegistro.push({...r,error}); if(r.status===200&&sesion)usuarios[i]={cookie:sesion,correo:datos.correos[i]};
    if((i+1)%30===0) console.log(`Registros: ${i+1}/${REGISTROS}`);
  });
  reporte("1. Pico gradual de registro",muestrasRegistro,duracionRegistro);
  if(usuarios.filter(Boolean).length!==REGISTROS) throw new Error(`Solo se registraron ${usuarios.filter(Boolean).length}/${REGISTROS}`);

  const muestrasRafaga=[]; const duracionRafaga=await programar(65,7000,async(i)=>muestrasRafaga.push(await completar(usuarios[i].cookie,datos.codigos.rafaga)));
  reporte("2. Ráfaga QR de estación",muestrasRafaga,duracionRafaga);

  const inicioCarrera=performance.now();
  const carrera=await Promise.all([
    ...Array.from({length:25},()=>completar(usuarios[0].cookie,datos.codigos.mismo)),
    ...Array.from({length:60},(_,i)=>completar(usuarios[i].cookie,datos.codigos.distintos)),
    ...datos.codigos.multiples.map((codigo)=>completar(usuarios[0].cookie,codigo)),
  ]);
  reporte("3. Carrera de puntos e idempotencia",carrera,performance.now()-inicioCarrera);

  const invalido=await completar(usuarios[0].cookie,"codigo-mal-formado-que-no-existe");
  if(invalido.status!==404||!invalido.text.includes("no corresponde")) throw new Error("El QR inválido no devolvió un error claro");
  const duplicado=multipart({correo:datos.correos[0],nombres:"Duplicado",apellidos:"Prueba",empresaId:datos.empresaId,aceptaDatos:"on"},{campo:"foto",nombre:"perfil.png",tipo:"image/png",datos:FOTO});
  const respuestaDuplicada=await solicitar({method:"POST",path:"/api/registro",headers:duplicado.headers,body:duplicado.body});
  if(respuestaDuplicada.status!==409) throw new Error(`El registro duplicado respondió ${respuestaDuplicada.status}`);

  const seleccionados=usuarios.slice(-15); const inicioFotos=performance.now();
  const fotos=await Promise.all(seleccionados.map((usuario,i)=>{const boundary=`----pasaporte${randomBytes(12).toString("hex")}`;const partes=[Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="descripcion"\r\n\r\nCarga ${RUN_ID} foto ${i}\r\n`),Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="foto"; filename="foto-${i}.png"\r\nContent-Type: image/png\r\n\r\n`),FOTO,Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="miniatura"; filename="mini-${i}.png"\r\nContent-Type: image/png\r\n\r\n`),FOTO,Buffer.from(`\r\n--${boundary}--\r\n`)];const body=Buffer.concat(partes);return solicitar({method:"POST",path:"/api/recuerdos",headers:{Cookie:usuario.cookie,"Idempotency-Key":`${RUN_ID}-foto-${i}`,"Content-Type":`multipart/form-data; boundary=${boundary}`,"Content-Length":body.length},body,timeoutMs:60_000});}));
  reporte("5. Subida concurrente de fotos",fotos,performance.now()-inicioFotos);

  detener=true; await polling; reporte("4. Podio bajo escritura concurrente",muestrasRanking,Math.max(...muestrasRanking.map((m)=>m.ms),1)*muestrasRanking.length);
  const integridad=await control("verificar");
  const esperadoPrimero=datos.puntos.registro+datos.puntos.rafaga+datos.puntos.mismo+datos.puntos.distintos+datos.codigos.multiples.length*datos.puntos.multi;
  const esperadoGlobal=REGISTROS*datos.puntos.registro+65*datos.puntos.rafaga+datos.puntos.mismo+60*datos.puntos.distintos+datos.codigos.multiples.length*datos.puntos.multi+15*10;
  const sumaEquipos=integridad.totalesEquipo.reduce((suma,item)=>suma+item.puntos,0);
  const fallos=[];
  for(const rep of reportes) if(rep.errores.total) fallos.push(`${rep.escenario}: ${rep.errores.total} errores`);
  if(integridad.registrados!==REGISTROS)fallos.push(`Registrados ${integridad.registrados}/${REGISTROS}`);
  if(integridad.rafaga!==65)fallos.push(`Ráfaga persistida ${integridad.rafaga}/65`);
  if(integridad.mismoPrimero!==1)fallos.push(`Idempotencia dejó ${integridad.mismoPrimero} registros`);
  if(integridad.distintos!==60)fallos.push(`Distintos persistidos ${integridad.distintos}/60`);
  if(integridad.multiplesPrimero!==datos.codigos.multiples.length)fallos.push(`Multireto persistido ${integridad.multiplesPrimero}/${datos.codigos.multiples.length}`);
  if(integridad.totalPrimero!==esperadoPrimero)fallos.push(`Total crítico ${integridad.totalPrimero}, esperado ${esperadoPrimero}`);
  if(integridad.inconsistencias.length)fallos.push(`${integridad.inconsistencias.length} totales individuales inconsistentes`);
  if(integridad.duplicados)fallos.push(`${integridad.duplicados} completitudes duplicadas`);
  if(integridad.equiposIncorrectos)fallos.push(`${integridad.equiposIncorrectos} asignaciones de equipo incorrectas`);
  if(sumaEquipos!==esperadoGlobal)fallos.push(`Suma de equipos ${sumaEquipos}, esperada ${esperadoGlobal}`);
  if(integridad.recuerdos!==15||integridad.archivosInvalidos)fallos.push(`Recuerdos ${integridad.recuerdos}/15, archivos inválidos ${integridad.archivosInvalidos}`);
  const resultado={fecha:new Date().toISOString(),entorno:estado,runId:RUN_ID,carga:{registros:REGISTROS,rampaSegundos:RAMPA_MS/1000,rafaga:65,carreraSolicitudes:carrera.length,fotos:15},reportes,integridad,esperadoPrimero,esperadoGlobal,sumaEquipos,fallos};
  await mkdir("test-results",{recursive:true}); await writeFile("test-results/load-evento-actual.json",JSON.stringify(resultado,null,2));
  console.log(`RESULTADO:${JSON.stringify({fallos,integridad,reportes})}`);
  if(fallos.length)process.exitCode=1;
} catch(error) {
  console.error(error); process.exitCode=1;
} finally {
  if(preparado){try{const limpieza=await control("limpiar");console.log(`Limpieza:${JSON.stringify(limpieza)}`);}catch(error){console.error("No se pudo limpiar",error);process.exitCode=1;}}
  agente.destroy();
}