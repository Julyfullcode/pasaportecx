# Suite automatizada de Pasaporte CX

La suite usa Playwright, una base SQLite exclusiva (`prisma/test-e2e.db`) y un directorio de archivos aislado (`.e2e-uploads`). Antes de cada ejecución completa ambos se reinician. No se conecta a Supabase ni modifica producción.

## Ejecución

```bash
npm run test:e2e
```

La primera vez debe estar instalado Chromium para Playwright:

```bash
npx playwright install chromium
```

## Casos cubiertos

| Test automatizado | Pasos | Resultado esperado |
|---|---|---|
| Registro exitoso con nombre y foto, asignado al equipo elegido | Abrir registro, completar nombre, empresa y equipo, adjuntar foto, aceptar datos y enviar. | Se crea el pasaporte, se asigna `Equipo Aurora` y se otorgan los puntos configurados por registro. |
| Registro con nombre vacío es rechazado por validación | Completar los demás campos dejando el nombre vacío e intentar enviar. | El navegador impide el envío, muestra validación y no se crea ningún participante. |
| Registro sin foto es rechazado con un mensaje claro | Completar identidad, empresa, equipo y autorización sin adjuntar foto. | Se muestra “Toma o selecciona una foto para continuar” y no se crea el registro. |
| Dos altas con el mismo nombre crean pasaportes distintos | Enviar simultáneamente dos registros con el mismo nombre y foto. | Ambos se aceptan y reciben códigos de recuperación distintos. Esta es la política actual porque no se recopila un identificador único. |
| Un QR válido suma los puntos correctos | Autenticar un participante con 25 puntos iniciales y abrir el reto de 100 puntos. | Se muestra `+100`, el total queda en 125 y la base refleja el mismo valor. |
| Un código QR mal formado muestra error claro | Escribir un código con caracteres inválidos en el ingreso manual. | La aplicación permanece en el escáner y explica que el formato no es válido. |
| El mismo reto no suma dos veces | Completar un reto, recargar su URL y consultar la base. | Se informa que ya estaba completado, existe una sola completitud y el total sigue en 125. |
| Los puntos se reflejan en el perfil | Completar el reto por API y abrir la vista inicial del participante. | La tarjeta “Tu puntaje total” muestra 125. |
| Podio individual top 5 | Consultar ranking y abrir la proyección autenticada. | Aparecen `Podio 1` a `Podio 5` en orden descendente; `Podio 1` figura en primer lugar. |
| Podio de equipos top 3 | Consultar ranking por suma y abrir la proyección de equipos. | El orden es Aurora, Bosque y Río, con sus posiciones 1, 2 y 3. |
| Podio actualizado con 10 participantes concurrentes | Abrir el podio, hacer que 10 participantes completen el reto simultáneamente y esperar el polling. | Las 10 completitudes se guardan y el participante que supera 5.000 puntos pasa visualmente al primer lugar. |
| Vista administrativa protegida | Abrir `/admin/participantes` y `/api/proyeccion/datos` sin sesión. | La página redirige al login y la API responde 401. |
| Creación de reto durante el evento | Autenticar administrador, crear y publicar un check-in, luego abrir desafíos como participante. | El reto aparece al participante en la siguiente navegación o actualización, sin redespliegue. |
| Subida de recuerdo | Autenticar participante, adjuntar foto, escribir descripción y subir. | La interfaz muestra “Listo” y existe exactamente un recuerdo asociado. |
| Carrusel con 50 participantes | Precargar 60 personas, abrir la proyección en modo carrusel y observar dos ciclos. | Se muestran cuatro personas por ciclo, cambia el conjunto visible y no hay errores de página. |
| 60 usuarios virtuales simultáneos | Ejecutar en paralelo 5 registros, 10 escaneos y 45 consultas de ranking. | Todas las respuestas son exitosas en menos de 30 segundos y los 15 cambios esperados persisten sin pérdida. |
| 10 requests concurrentes del mismo reto | Enviar diez completitudes simultáneas con la misma sesión y el mismo reto. | Todas las solicitudes son idempotentes: queda una completitud y solo se suman 100 puntos. |

## Alcance de rendimiento

La prueba de 60 usuarios es una validación funcional de concurrencia, no un benchmark de capacidad máxima. Se ejecuta contra el servidor local y SQLite para detectar errores, pérdida de datos y carreras lógicas. Antes del evento conviene ejecutar una prueba de carga adicional contra un entorno de staging con PostgreSQL y la misma región/configuración de Vercel y Supabase que producción.

## Revisión de seguridad evidente

Hallazgos que no impiden ejecutar la suite, pero conviene atender:

1. **Alta — falta limitación de frecuencia.** Registro, recuperación y login administrativo no tienen rate limiting visible. Esto permite altas masivas, abuso de almacenamiento e intentos repetidos de contraseña.
2. **Media — ranking público con datos personales.** `/api/ranking` no exige sesión y entrega nombre, foto, empresa y equipo de todos los participantes. Debe decidirse si es intencional; si no, debe requerir sesión de participante o administrador.
3. **Media — archivos validados por MIME declarado.** Las cargas restringen tipo y tamaño, pero no verifican la firma binaria real de la imagen. Un cliente puede falsificar `Content-Type`; se recomienda decodificar/re-encodear en servidor o validar magic bytes.
4. **Media — registro duplicado y automatizable.** Al no existir correo, documento ni identificador del evento, el mismo nombre puede crear múltiples pasaportes. Es una decisión de privacidad válida, pero necesita controles antiabuso alternativos.
5. **Baja/Media — stream público sin cuota.** `/api/stream` acepta conexiones sin autenticación. Aunque no expone datos personales, muchas conexiones persistentes podrían consumir recursos.

Controles positivos observados: las rutas administrativas revisadas exigen sesión; las cookies son `httpOnly`, `sameSite` y `secure` en producción; los puntos se recalculan dentro de transacciones; y existe una restricción única por participante/reto.
