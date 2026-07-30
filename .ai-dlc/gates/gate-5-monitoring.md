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

Al diagnosticarlo el 2026-07-30 apareció una segunda capa: el healthcheck estaba **roto por
construcción**. Apuntaba a `http://localhost/`, que en la imagen resuelve también a `::1`, el
`wget` de busybox intenta IPv6 primero y nginx solo escucha en IPv4. Nunca dio verde en
ningún despliegue de esta imagen. El sitio, entretanto, servía correctamente: el rojo era
del chequeo, no del servicio.

Eso agrava el A09 (*Security Logging & Monitoring Failures*) en lugar de suavizarlo. La
versión corta —«el healthcheck funciona pero nadie escucha»— era optimista: el contenedor
venía diciendo «rojo» desde que se creó, el 2026-07-14, y nadie lo leyó en dos semanas. Un
chequeo que nadie mira no se distingue de uno que no funciona, y aquí coincidieron los dos
fallos sin que el sistema pareciera anormal.

Corolario para el mínimo viable de abajo: un monitor externo habría avisado del rojo, pero
habría avisado de un falso positivo. Vigilar sin verificar de vez en cuando **qué** se
vigila produce ruido, no señal.

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
