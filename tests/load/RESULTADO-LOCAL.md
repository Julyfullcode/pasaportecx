# Resultado acelerado local

Fecha de ejecución: 5 de agosto de 2026. Perfil `quick` sobre Next.js en modo producción, SQLite y almacenamiento local.

| Escenario | Requests | avg | p95 | p99 | Throughput | Error |
|---|---:|---:|---:|---:|---:|---:|
| Registro gradual | 30 | 114,86 ms | 158,79 ms | 163,67 ms | 1,98 req/s | 0% |
| Ráfaga QR | 30 | 40,52 ms | 49,89 ms | 54,22 ms | 9,87 req/s | 0% |
| Carrera de puntos | 32 | 18.888,49 ms | 30.028,89 ms | 30.054,92 ms | 1,06 req/s | 62,5% |
| Podio bajo escritura | 16 | 1.900,19 ms | 30.001,44 ms | 30.001,44 ms | 0,32 req/s | 6,25% |
| Fotos concurrentes | 10 | 34.081,43 ms | 34.219,17 ms | 34.219,17 ms | 0,29 req/s | 40% |

## Integridad observada

- El participante sometido a 12 solicitudes del mismo desafío dejó exactamente una completitud: no hubo duplicación de puntos.
- No se detectaron totales de puntos matemáticamente incorrectos ni completitudes duplicadas.
- Las 20 escrituras para participantes distintos no persistieron debido a `P1008 Socket timeout` de SQLite.
- Se guardaron 6 de 10 recuerdos. Todos los archivos persistidos fueron legibles y no estaban corruptos; los otros 4 requests devolvieron error 5xx por el bloqueo de base.
- Una de 16 lecturas del podio expiró mientras la base estaba bloqueada.

## Dictamen

El registro y una ráfaga QR de casi 10 requests por segundo funcionaron sin errores. La lógica de idempotencia evita duplicados, pero el perfil local no soporta el bloque de escrituras concurrentes por la limitación de un solo escritor de SQLite. Como producción usa PostgreSQL, este resultado no permite afirmar que producción tenga el mismo cuello de botella, pero tampoco permite certificar margen para el evento. La prueba completa debe pasar con 0 errores sobre un staging de Supabase/PostgreSQL antes del encuentro.
