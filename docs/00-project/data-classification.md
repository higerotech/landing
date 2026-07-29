# Clasificación de Datos

* **Estado:** approved
* **Fecha:** 2026-07-29
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 0.1.0
* **Owner de datos (DPO):** Jeremi Alcalá
* **Regulación aplicable:** Ninguna de tratamiento de datos personales — ver justificación

Niveles: Público < Interno < Confidencial < Restringido.

## Conclusión primero

**Este sistema no recolecta, procesa ni almacena datos personales.** No hay formularios,
ni cookies, ni analítica, ni backend. El servidor no escribe nada (`read_only: true`).

Por eso no aplican GDPR, LOPD ni normativa de protección de datos: no hay tratamiento que
regular. Esto no es un descuido pendiente de resolver — es una consecuencia directa de una
decisión de alcance (ver charter, §No incluye). Si se añade un formulario de contacto o
analítica, **esta clasificación queda invalidada** y hay que rehacerla junto con el threat
model.

## Inventario

| Dato | Clasificación | Regulación | Cifrado en reposo | Cifrado en tránsito | Retención |
|---|---|---|---|---|---|
| Contenido de la página (copy ES/EN, imágenes) | Público | — | No aplica | TLS en el borde | Indefinida (versionado en git) |
| `contacto@higerotech.com` | Público | — | No aplica | TLS en el borde | Indefinida |
| Número de WhatsApp corporativo | Público | — | No aplica | TLS en el borde | Indefinida |
| Preferencia de idioma del visitante | Interno | — | No — `localStorage` del navegador, nunca sale del dispositivo | No aplica | Hasta que el visitante limpie su navegador |
| Logs de acceso de nginx (IP, user-agent, ruta) | **Confidencial** | — | No — stdout del contenedor | No aplica | 30 MB rotativos (10 MB × 3) |
| Configuración de nginx y Docker | Interno | — | Versionada en git | — | Indefinida |

## Notas por dato

**Preferencia de idioma.** Vive en `localStorage`, en el dispositivo del visitante. El
servidor nunca la ve. No es una cookie: no se transmite en ninguna petición, por lo que no
entra en el ámbito de la directiva ePrivacy y no requiere consentimiento.

**Logs de nginx.** Es el único dato del inventario que puede considerarse personal: una
dirección IP lo es bajo criterio europeo. Están clasificados como Confidencial por eso.
Mitigaciones vigentes:

- `access_log off` en `/assets/`, `/robots.txt` y `/sitemap.xml`: no se registra el grueso
  de las peticiones, solo las de páginas.
- Rotación agresiva: 3 archivos de 10 MB. En este volumen de tráfico, la ventana real de
  retención es de días, no meses.
- Los logs no salen del host: no se envían a ningún servicio externo.

`<TODO: decidir si conviene desactivar del todo el registro de IP con un formato de log
personalizado. Reduce el dato personal a cero, a cambio de perder capacidad de diagnóstico.>`

**Correo y WhatsApp publicados.** Son datos de contacto corporativos, publicados
deliberadamente. Su recolección por scrapers es un coste asumido del canal, no un incidente
de seguridad (ver `SECURITY.md`, §Fuera de alcance).

## Qué cambiaría con un formulario de contacto

Registrado por adelantado para que la decisión sea informada cuando llegue:

| Nuevo dato | Clasificación | Implicaciones |
|---|---|---|
| Nombre, correo, empresa, mensaje | Confidencial | Tratamiento de datos personales: base legal, aviso de privacidad, derechos ARCO, plazo de retención |
| Metadatos del envío (IP, marca de tiempo) | Confidencial | Mismo régimen |

Además implicaría: backend o servicio de terceros (nuevo actor en el DFD), validación de
entrada (A05 pasa de Parcial a Aplica), protección anti-spam, nivel ASVS objetivo L2 en
lugar de L1, y reapertura de los Gates 0 y 1.
