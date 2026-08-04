# Pasaporte CX · Grupo EPM

Aplicación web mobile-first para gamificar el encuentro presencial de la Vicepresidencia Experiencia Usuario-Cliente. Gestiona registro sin contraseña, desafíos activados por QR, puntuación individual y por equipos, evidencias, recuerdos, proyecciones y reportes.

## Puesta en marcha local

Requisitos: Node.js LTS 22 o 24 y npm.

```bash
npm install
copy .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

Abra `http://localhost:3000`. El administrador queda en `http://localhost:3000/admin/login` con `admin` / `Cambiar123!` si no cambió las variables del seed. Cambie estas credenciales antes de compartir el entorno.

El seed crea 14 empresas, 5 componentes, 6 equipos, 4 ubicaciones, 18 participantes, 10 desafíos que cubren los cinco tipos y 12 recuerdos con ilustraciones generadas localmente. Los nombres `Equipo 1` a `Equipo 6` se renombran en `/admin/configuracion` o `/admin/grupos`.

## Comandos

```bash
npm run dev          # desarrollo
npm run lint         # ESLint
npm run typecheck    # TypeScript strict
npm test             # Vitest, incluida idempotencia contra SQLite
npm run test:e2e     # Playwright: suite funcional, podios, administración y concurrencia
npm run build        # build de producción
npm run seed         # repuebla la demostración (borra datos actuales)
npm run db:studio    # inspector visual de Prisma
```

La primera ejecución E2E requiere `npx playwright install chromium`.
La suite crea y reinicia exclusivamente `prisma/test-e2e.db` y `.e2e-uploads`; nunca usa la base configurada en `.env` ni producción. La matriz completa de casos está en `docs/PRUEBAS_AUTOMATIZADAS.md`.

## Arquitectura y decisiones

- Next.js 15 con App Router, Server Actions y Route Handlers. No hay backend separado.
- Prisma 6.13. SQLite vive en `prisma/dev.db` para desarrollo. Prisma exige un `provider` literal; por eso producción usa el esquema gemelo `prisma/schema.postgresql.prisma`, que solo cambia ese provider. Mantenga ambos modelos sincronizados.
- Las completitudes tienen una restricción única `(participanteId, desafioId)`. El handler captura `P2002` y devuelve la completitud existente; un doble toque o dos solicitudes concurrentes no duplican puntos.
- Todo cambio de completitud, aprobación o ajuste recalcula `puntosTotales` dentro de la misma transacción.
- Las vistas se actualizan con polling visible, sin solicitudes solapadas: 3–5 segundos en proyección, 10 segundos en ranking y 30 segundos en el muro. Las pestañas ocultas no consultan.
- Las fotos usan nombres criptográficamente aleatorios y `StorageAdapter`. Producción usa Supabase Storage; la ruta `/uploads` agrega caché CDN inmutable.
- Las fotos se comprimen en el navegador y se validan nuevamente en el servidor. Cada dispositivo sube como máximo dos recuerdos en paralelo.
- Las sesiones de participante y administrador son independientes, persistentes y usan tokens aleatorios almacenados como hash; la cookie es `httpOnly`, `sameSite` y `secure` en producción.

## Marca

Toda la paleta está centralizada y comentada en `app/tokens.css`. Cambiar un color allí actualiza la interfaz completa.

La aplicación usa el logo oficial preparado en `public/marca/logo-grupo-epm-oficial.png` mediante el componente único `components/marca/Logo.tsx`.

Las fotos de personas usan siempre `FotoCircular`; los recuerdos son la excepción rectangular. `CurvaMarca` y `TexturaArcos` contienen los recursos gráficos reutilizables.

## Despliegue en Vercel + PostgreSQL

1. Cree una base PostgreSQL administrada. En Supabase use Transaction Pooler (puerto 6543) para `DATABASE_URL` y Session Pooler (puerto 5432) para `DIRECT_URL`.
2. Configure en Vercel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`, `STORAGE_DRIVER` y las variables `SUPABASE_*`.
3. Genere y migre usando el esquema PostgreSQL:

   ```bash
   npx prisma generate --schema prisma/schema.postgresql.prisma
   npx prisma migrate deploy --schema prisma/schema.postgresql.prisma
   ```

4. Use `STORAGE_DRIVER=supabase`; el filesystem de una función serverless es efímero y no sirve para el álbum del evento.
5. Ejecute el seed solo si desea los datos de demostración; luego cambie la contraseña inicial.
6. Despliegue con `npm run build`. Para un evento real, pruebe la red del lugar y deje abierta una pestaña de administración.

## Guía del administrador durante el evento

### Antes de abrir puertas

1. Entre a `/admin/configuracion` y ajuste el nombre del evento, el método de puntaje y los tamaños de los podios.
2. Renombre los seis equipos y confirme sus colores en `/admin/grupos`.
3. Agregue las empresas, componentes o ubicaciones faltantes desde los catálogos. Nada de esto requiere redesplegar.
4. Pruebe un registro y un QR desde un celular conectado al wifi del evento.

### Crear un desafío en caliente

1. Abra `/admin/desafios` y despliegue **Crear desafío ahora**.
2. Escriba título, descripción, tipo y puntos. Para el Día 2 elija componente; para el Día 1 elija ubicación.
3. Complete los campos específicos. En opción múltiple, escriba una opción por línea y anteponga `*` a cada correcta.
4. Elija **Publicado** si debe funcionar de inmediato, o **Borrador** para prepararlo.
5. Guarde. El código y el QR se generan automáticamente. Use **PNG** para piezas digitales o **PDF** para imprimir. El botón superior descarga todos los QR publicados, uno por página.

Para sumar un componente o equipo durante el evento, vaya a `/admin/configuracion`, agréguelo en el catálogo y vuelva al formulario: aparecerá inmediatamente.

### Qué pantalla proyectar

- Registro y coffee breaks: `/admin/proyeccion/asistentes`. Presenta personas, integra recién registrados y los marca con **¡Bienvenido!**.
- Actividad social o salida nocturna: `/admin/proyeccion/recuerdos`.
- Seguimiento competitivo: `/admin/proyeccion/podio` o `/admin/proyeccion/equipos`.
- Pantalla permanente: `/admin/proyeccion/mixto`; alterna automáticamente según el ciclo definido en Configuración.

Abra cada URL en una pestaña independiente y active pantalla completa del navegador. No tienen menús y se actualizan solas.

### Evidencias, personas y equipos

- El contador de `/admin/evidencias` indica fotos pendientes. **Aprobar** suma los puntos dentro de la misma operación; **Rechazar** conserva el registro con cero puntos.
- En `/admin/participantes` puede buscar, filtrar, cambiar de equipo, desactivar o ajustar puntos. Todo ajuste exige un motivo.
- `/admin/grupos` muestra composición y una sugerencia de rebalanceo. La sugerencia nunca mueve personas por sí sola.
- El ranking de equipos siempre muestra si el criterio actual es promedio o suma.

### Moderar y entregar recuerdos

En `/admin/recuerdos` filtre reportados o pendientes. Puede mostrar, ocultar, eliminar o descargar una foto. **Descargar álbum ZIP** prepara todos los originales para entregar al finalizar.

### Cierre y reportes

`/admin/reportes` exporta CSV de participantes, rankings, completitudes, encuestas, empresas y componentes. Descárguelos antes de la purga.

Al terminar cada ciclo de pruebas, la sección roja de `/admin/configuracion` permite preparar nuevamente la aplicación y exige escribir dos veces `PREPARAR PARA PUBLICO REAL`. El proceso elimina participantes y todos sus datos asociados (sesiones, respuestas, puntos, ajustes, recuerdos, reacciones, fotos y evidencias), pero conserva desafíos, agenda, catálogos, configuración del evento y administradores. Ejecútelo una última vez antes de abrir el registro al público real.

### Si algo falla

- Si una mutación tarda, espere el mensaje final; no cierre la pestaña. Los botones muestran carga y permiten reintentar.
- Un doble escaneo no duplica puntos. Si el celular perdió red, use el botón de reintento: la respuesta sigue en el formulario.
- Las vistas se actualizan automáticamente mientras la pestaña está visible y se sincronizan al recuperar el foco.
- Si la cámara está bloqueada, autorice este sitio en la configuración del navegador o escriba manualmente el código impreso.
- Si una foto del lote falla, reintente solamente esa fila.
- Si la proyección se congela, recargue únicamente esa pestaña; la operación y los puntos permanecen en la base de datos.

## Privacidad y operación

No publique `.env`, `prisma/dev.db` ni `/uploads`. Use HTTPS en el evento para que los navegadores permitan cámara. El consentimiento de tratamiento es obligatorio y explica el uso temporal de nombre y foto. La purga es irreversible respecto a los archivos, así que descargue reportes y álbum antes de ejecutarla.
