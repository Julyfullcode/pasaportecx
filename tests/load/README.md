# Pruebas de carga de Pasaporte

La suite usa los contratos reales del backend:

- `POST /api/registro`: `multipart/form-data`; requiere correo autorizado, datos personales y foto. Devuelve la cookie `pasaporte_participante`.
- `POST /api/desafios/:codigo/completar`: requiere la cookie de participante. La restricción única participante/desafío debe impedir dobles puntos.
- `GET /api/ranking`: requiere cookie de participante o administrador. Se consulta cada 3–5 segundos durante las escrituras.
- `POST /api/recuerdos`: requiere cookie, foto, miniatura e `Idempotency-Key`.

## Ejecución

Perfil completo del evento: 120 registros distribuidos durante 12 minutos, 65 QR en 7 segundos, carreras de puntos y 15 fotos concurrentes:

```powershell
npm run test:load
```

Perfil rápido para CI o diagnóstico local:

```powershell
$env:LOAD_PROFILE="quick"
npm run test:load
```

El reporte legible aparece en consola y el JSON queda en `test-results/load-evento.json` o `test-results/load-quick.json`.

La ejecución local usa SQLite y sirve para verificar contratos, métricas e integridad funcional, pero no certifica la capacidad de Supabase/PostgreSQL. Para certificar el entorno real se debe usar una copia staging aislada:

```powershell
$env:LOAD_BASE_URL="https://staging.example.com"
$env:LOAD_DATABASE_URL="postgresql://..."
$env:DATABASE_URL=$env:LOAD_DATABASE_URL
$env:DIRECT_URL=$env:LOAD_DATABASE_URL
$env:LOAD_ALLOW_REMOTE="1"
npx prisma generate --schema prisma/schema.postgresql.prisma
npx playwright test --config=playwright.load.config.ts
```

La suite crea datos de prueba en la base indicada. El staging debe ser desechable o limpiarse después de la ejecución.

Por seguridad, la suite bloquea destinos remotos. Para un entorno de carga aislado debe configurarse explícitamente `LOAD_BASE_URL`, `LOAD_DATABASE_URL` y `LOAD_ALLOW_REMOTE=1`. No debe ejecutarse contra producción porque crea participantes, completitudes y archivos.

La aplicación ya no tiene equipos. Por eso la segunda parte de la carrera usa participantes distintos de la misma empresa y valida la integridad individual exacta; no existe un acumulado de equipo que verificar.
