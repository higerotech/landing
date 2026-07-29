# Gate 5 — Monitoreo (cierre de Fase 06)

* **Estado:** draft — **no superado**
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá (owner)
* **Fase AI-DLC:** 06-monitoring
* **Versión:** 0.1.0

- [ ] SLIs/SLOs definidos y monitoreados
- [ ] Dashboard de seguridad activo
- [ ] Tres pilares operando (métricas, logs, traces)
- [ ] Proceso de respuesta a incidentes documentado y probado
- [ ] Feedback loop a fases previas establecido

## Estado real

La fase 06 **no se ha documentado** porque no hay nada que documentar todavía: no existe
observabilidad más allá del healthcheck de Docker y los logs de nginx a stdout.

Escribir un `observability.md` hoy sería redactar aspiraciones, no documentación. Se deja
la brecha visible en lugar de rellenarla.

## La evidencia de por qué importa

El 2026-07-29, durante la revisión de este repositorio, el contenedor de producción llevaba
**24 horas en estado `unhealthy`** sin que se hubiera disparado ningún aviso. El fallo solo
se descubrió al listar los contenedores del host por otro motivo.

Ese es exactamente el riesgo A09 (*Security Logging & Monitoring Failures*) materializado:
el healthcheck existe y funciona, pero nadie está escuchando.

## Mínimo viable para cerrar el gate

Proporcionado al tamaño real del sistema — una landing estática no necesita Prometheus:

| Pilar | Mínimo propuesto |
|---|---|
| Disponibilidad | Monitor externo HTTP (UptimeRobot, Healthchecks.io o el `web-status-asap` que ya corre en el host) con alerta a correo/Telegram |
| SLI | Disponibilidad medida desde fuera de la red del host |
| SLO | 99,5 % mensual — deliberadamente por debajo del 99,99 % que el sitio anuncia como objetivo *para clientes*; conviene no confundir la promesa comercial con el SLO interno de la propia web |
| Logs | Los de nginx ya rotan vía `json-file` (10 MB × 3). Suficiente. |
| Incidentes | Un runbook de una página: quién mira, cómo se reinicia, cómo se hace rollback |
| Trazas | No aplica: no hay sistema distribuido que trazar |

Nota sobre el SLO: el sitio publica objetivos de 99,9 / 99,99 / 99,999 % como oferta de
servicio a clientes. Ese número no es el SLO de esta landing y no debe copiarse aquí —
son cosas distintas y mezclarlas crearía una expectativa que la infraestructura actual
(un contenedor, un host, sin réplica) no puede sostener.
