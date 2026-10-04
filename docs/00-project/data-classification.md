# Clasificación de Datos

* **Estado:** **revisado el 2026-09-16 — pendiente de re-aprobación del owner.** La
  conclusión de portada cambió de sentido (ver §Conclusión primero). Era un artefacto aprobado
  en Gate 0, así que quien lo aprobó tiene que volver a hacerlo: que la corrección sea correcta
  no la convierte en aprobada
* **Fecha:** 2026-07-29, revisado el 2026-09-16
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 0.2.0
* **Owner de datos (DPO):** Jeremi Alcalá
* **Regulación aplicable:** Arts. 28 y 60 CRBV (habeas data) y la jurisprudencia vinculante de
  la Sala Constitucional. **No existe ley general de protección de datos en Venezuela** —
  verificado en la investigación de marco legal, §1.2. RGPD: probablemente no alcanza al sitio
  (§2.2), y aun así se aplican sus principios por diseño

Niveles: Público < Interno < Confidencial < Restringido.

## Conclusión primero

**El sitio no emite cookies, no ejecuta analítica, no tiene formularios ni backend, y no
construye perfiles de sus visitantes.** El servidor no escribe nada (`read_only: true`). Eso
sigue siendo cierto, sigue siendo una decisión de alcance deliberada (charter, §No incluye) y
sigue siendo un argumento comercial fuerte.

**Lo que no es cierto es que no haya tratamiento de datos personales.** Hay dos, y son
pequeños pero reales:

1. **La dirección IP del visitante.** Cloudflare la recibe y la trata en el borde para poder
   entregar la respuesta, con o sin logs habilitados, y el servidor de contingencia la registra
   en sus logs técnicos. Una IP es dato personal bajo criterio europeo, y este documento ya lo
   reconocía en sus notas mientras la portada afirmaba lo contrario. La contradicción estaba
   dentro del propio archivo.
2. **Los datos de quien nos escribe.** El charter sacó el formulario de contacto del alcance
   razonando que «sin formulario no hay datos personales que custodiar», pero el canal existe:
   es `mailto:` y WhatsApp. Un prospecto envía su nombre, su correo, su empresa y el contenido
   de su consulta, y eso se conserva en una bandeja. **Quitar el formulario eliminó la
   validación de entrada y el CAPTCHA, no el tratamiento.**

La inferencia inválida era «no hay formularios ⇒ no hay tratamiento». No se sostiene cuando el
sitio se sirve a través de un tercero y se publica una dirección de correo.

**Corregido también un error de norma:** la versión anterior decía que «no aplican GDPR, LOPD
ni normativa de protección de datos». **No existe ninguna «LOPD» venezolana** — ni LOPD, ni ley
general de protección de datos, ni autoridad de control. Lo que aplica son los arts. 28 y 60 de
la Constitución y la jurisprudencia de la Sala Constitucional. Citar una norma inexistente en un
documento aprobado es peor que no citar ninguna.

Nada de esto convierte el riesgo en alto: sigue siendo bajo. Lo que cambia es que ahora se
puede **publicar una política de privacidad que sea verdad**, que era imposible mientras el
inventario negara el tratamiento que sí ocurre.

**Qué sigue invalidando esta clasificación:** añadir un formulario, analítica o cookies. Y
desde que Higerotech **opera** sistemas por cuenta de terceros, el tratamiento de esos datos
**no entra en este documento**: ahí Higerotech es encargado, no responsable, y el vehículo es el
DPA, no esta clasificación ni la política del sitio.

## Inventario

| Dato | Clasificación | Regulación | Cifrado en reposo | Cifrado en tránsito | Retención |
|---|---|---|---|---|---|
| Contenido de la página (copy ES/EN, imágenes) | Público | — | No aplica | TLS en el borde | Indefinida (versionado en git) |
| `contacto@higerotech.com` | Público | — | No aplica | TLS en el borde | Indefinida |
| Número de WhatsApp corporativo | Público | — | No aplica | TLS en el borde | Indefinida |
| Preferencia de idioma del visitante | Interno | — | No — `localStorage` del navegador, nunca sale del dispositivo | No aplica | Hasta que el visitante limpie su navegador |
| Logs de acceso de nginx (**sin IP**: fecha, petición, estado, bytes, user-agent, duración) | Interno | — | No — stdout del contenedor | No aplica | 30 MB rotativos (10 MB × 3) |
| **IP del visitante tratada por Cloudflare en el borde** | **Confidencial** | Arts. 28 y 60 CRBV. Transferencia internacional amparada por las SCC del DPA de Cloudflare | Gestionado por Cloudflare | TLS en el borde | **No se retiene**: la retención de logs HTTP (Logpull/Logpush) no está habilitada en `wrangler.jsonc` |
| **Correspondencia de prospectos** (nombre, correo, empresa, contenido del mensaje, número de WhatsApp) | **Confidencial** | Arts. 28 y 60 CRBV; base de licitud: ejecución precontractual | Según el proveedor de correo y WhatsApp | TLS del proveedor | `<TODO: fijar plazo — la investigación pide cifras, no fórmulas>` |
| Configuración de nginx y Docker | Interno | — | Versionada en git | — | Indefinida |

## Notas por dato

**Preferencia de idioma.** Vive en `localStorage`, en el dispositivo del visitante. El
servidor nunca la ve. No es una cookie: no se transmite en ninguna petición, por lo que no
entra en el ámbito de la directiva ePrivacy y no requiere consentimiento.

**Logs de nginx.** Eran el único dato del inventario que podía considerarse personal, porque
una dirección IP lo es bajo criterio europeo. **Desde el 2026-09-16 ya no la registran**: el
owner decidió desactivar el registro de IP al publicar la política de privacidad, y
`nginx.conf` define un `log_format sin_ip` propio —el `combined` de serie empieza por
`$remote_addr`— que omite también `$http_x_forwarded_for`.

Por eso bajan de **Confidencial a Interno**: sin IP no identifican a nadie. El precio se asume y
conviene tenerlo escrito: sin IP no se puede distinguir un rastreo abusivo de tráfico legítimo
repartido, ni correlacionar las peticiones de un mismo visitante. Se cambió capacidad de
diagnóstico por no custodiar el dato.

**U12.6 vigila esa decisión**, y no por pulcritud: la política publicada afirma que el sitio no
conserva direcciones IP. Si alguien vuelve al formato de serie, eso deja de ser una regresión
técnica y pasa a ser una declaración falsa en un documento con efectos.

Mitigaciones que siguen vigentes:

- `access_log off` en `/assets/`, `/robots.txt` y `/sitemap.xml`: no se registra el grueso
  de las peticiones, solo las de páginas.
- Rotación agresiva: 3 archivos de 10 MB. En este volumen de tráfico, la ventana real de
  retención es de días, no meses.
- Los logs no salen del host: no se envían a ningún servicio externo.

**Resuelto el 2026-09-16.** El `<TODO>` que llevaba abierto desde julio —si desactivar del
todo el registro de IP— se cerró a favor de desactivarlo, al publicar la política de privacidad.
Lo que lo desatascó no fue un argumento técnico nuevo: fue que había que escribir en un
documento público qué se registra, y la versión honesta de «registramos la IP unos días» es peor
producto que «no la registramos». Por el camino del Worker tampoco se retiene, así que la
política puede afirmar las dos cosas a la vez.

**Cloudflare es un encargado, y hasta ahora no figuraba.** El sitio se sirve desde Cloudflare
Workers (`wrangler.jsonc`, `worker/index.mjs`), así que Cloudflare ve la IP de cada visitante.
Su propio *Data Processing Addendum* lo dice sin ambigüedad: el cliente es el responsable y
Cloudflare el encargado. Tres consecuencias operativas:

- **No hay que firmar nada**: ese DPA se incorpora automáticamente al acuerdo principal.
- **Hay transferencia internacional** de la IP, amparada por las SCC de la UE, el *UK
  International Data Transfer Addendum* y el EU-US Data Privacy Framework. El mecanismo ya
  existe; basta declararlo.
- **No habilitar la retención de logs HTTP en Cloudflare es una decisión de privacidad**, del
  mismo tipo que el `access_log off` de nginx, y conviene documentarla como tal en vez de
  dejarla como un valor por defecto que nadie tocó.

La lista de subencargados que la política publique **empieza por Cloudflare**.

**Correo y WhatsApp publicados.** Las direcciones en sí son datos de contacto corporativos,
publicados deliberadamente; su recolección por scrapers es un coste asumido del canal, no un
incidente de seguridad (ver `SECURITY.md`, §Fuera de alcance).

Lo que **sí** es tratamiento es lo que llega por esos canales: el mensaje de un prospecto trae
su nombre, su correo, su empresa y el contenido de su consulta. La base de licitud es la
ejecución precontractual —responder a quien pide un diagnóstico— y el plazo de retención está
pendiente de decisión del owner. Es el único tratamiento del que Higerotech es responsable con
datos que una persona envía a propósito, así que es el que más importa declarar bien.

## Qué cambiaría con un formulario de contacto

Registrado por adelantado para que la decisión sea informada cuando llegue:

| Nuevo dato | Clasificación | Implicaciones |
|---|---|---|
| Nombre, correo, empresa, mensaje | Confidencial | Tratamiento de datos personales: base legal, aviso de privacidad, derechos ARCO, plazo de retención |
| Metadatos del envío (IP, marca de tiempo) | Confidencial | Mismo régimen |

Además implicaría: backend o servicio de terceros (nuevo actor en el DFD), validación de
entrada (A05 pasa de Parcial a Aplica), protección anti-spam, nivel ASVS objetivo L2 en
lugar de L1, y reapertura de los Gates 0 y 1.
