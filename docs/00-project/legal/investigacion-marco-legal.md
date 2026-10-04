# Investigación de Marco Legal — Base para Política de Privacidad y Términos

* **Estado:** draft
* **Fecha:** 2026-09-16
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 0.2.0
* **Tipo:** investigación — **no** es el texto legal, es el insumo para redactarlo
* **Ámbito:** Higerotech (consultora) y `higerotech.com` (esta landing)

## Conclusión primero

1. **Venezuela no tiene ley general de protección de datos personales.** No existe
   autoridad de control, ni registro de bases de datos, ni obligación de notificar brechas,
   ni figura legal de DPO. Lo que hay es un **derecho constitucional** (arts. 28 y 60 CRBV)
   desarrollado por **jurisprudencia vinculante** de la Sala Constitucional del TSJ, más
   disposiciones dispersas en leyes sectoriales. El intento legislativo se abandonó en 2005.
2. **El riesgo venezolano real no es una multa administrativa por datos: es penal y
   sectorial.** La Ley Especial contra los Delitos Informáticos castiga con **prisión de 2 a
   6 años** el apoderamiento o la revelación indebida de data personal (arts. 20 y 22). Y el
   régimen SUDEBAN sanciona a la institución bancaria y le exige controlar a su proveedor,
   lo que se traduce en obligaciones contractuales duras para Higerotech.
3. **La conclusión de `data-classification.md` ("este sistema no recolecta, procesa ni
   almacena datos personales") hay que matizarla — pero el hecho verificado juega a favor.**
   Se leyó el código: `worker/index.mjs` **no accede a `request.headers` de entrada, ni a
   `request.cf`, ni a la IP**, y `wrangler.jsonc` no declara `observability`. **En la ruta de
   producción Higerotech no genera ni retiene direcciones IP.** Quien las ve es **Cloudflare**,
   como encargado, en su propia plataforma. Así que hay tratamiento y hay un encargado
   extranjero, pero **el vector relevante no son "los logs de nginx que no salen del host"
   —esos solo existen en la variante Docker de contingencia— sino los logs de borde de
   Cloudflare**. La afirmación absoluta de que no hay tratamiento sigue siendo incorrecta y,
   publicada en una política, sería una **declaración falsa**; la versión correcta es más
   fuerte comercialmente y es demostrable en 56 líneas de código auditables.
4. **El documento que más protege a Higerotech no es la política de privacidad del sitio:
   es el DPA + las condiciones de servicio (MSA).** El sitio es una superficie de riesgo
   casi nula. El riesgo grande está en las aplicaciones que Higerotech construye y a veces
   opera para terceros, y en las declaraciones de cumplimiento que hace en la landing.
5. **Cuatro riesgos extraterritoriales concretos y accionables**, todos verificados en fuente
   primaria (§2):
   - **AI Act art. 5(1)(d)** — puntuar a **personas físicas** por su propensión a cometer un
     delito (el blanqueo lo es) basándose solo en perfilado o rasgos es una **práctica
     prohibida**, vigente desde el 2 de febrero de 2025, con el tope más alto del Reglamento.
     La salida es una **regla de arquitectura**: puntuar transacciones y personas jurídicas a
     partir de hechos objetivos, nunca personas por rasgos.
   - **Ley 21.719 de Chile, art. 1° bis, inciso final** — la ley se aplica a quien, sin estar
     establecido en Chile, *"le resulte aplicable la legislación nacional **a causa de un
     contrato**"*. **Basta aceptar ley chilena en un MSA para meterse por su propia firma** en
     el marco de mayor severidad relativa. Entra en vigencia el 1 de diciembre de 2026.
   - **GDPR por contagio de cliente** — el EDPB es explícito: el encargado de un responsable
     que hace targeting a la UE **queda sujeto al GDPR por el art. 3.2**. Y la excepción del
     art. 27.2(a) **no** salva a Higerotech, porque el EDPB entiende "occasional" como lo que
     no se hace regularmente ni en el curso normal del negocio.
   - **Argentina art. 12** — la transferencia de datos personales a países sin nivel adecuado
     está **prohibida**, y **Venezuela no está en la lista** de la Disposición 60-E/2016. No es
     un riesgo de multa (el tope es irrisorio): es un **bloqueo comercial** que se resuelve
     teniendo pre-firmado el Anexo II de esa disposición.
6. **La acción más barata y de mayor rendimiento de todo el informe:** verificar en el panel de
   Cloudflare que **el DPA está aceptado** y guardar el comprobante con fecha. Su cláusula de
   efectividad dice *"from the date on which Customer signed or the parties otherwise agreed"*
   — **no se incorpora por el solo hecho de usar el servicio**. Coste: minutos.

---

## 1. Marco normativo venezolano aplicable

### 1.1 Base constitucional

| Norma | Contenido relevante | Estado |
|---|---|---|
| CRBV art. 28 | **Habeas data.** Toda persona tiene derecho a acceder a la información y los datos que sobre sí misma o sus bienes consten en **registros oficiales o privados**, con las excepciones que establezca la ley; a conocer el uso que se haga de ellos y su finalidad; y a solicitar ante el tribunal competente su actualización, rectificación o destrucción si fueran erróneos o afectaran ilegítimamente sus derechos. | Vigente |
| CRBV art. 60 | Protección del honor, vida privada, intimidad, propia imagen, confidencialidad y reputación. Encarga expresamente a **la ley** limitar el uso de la informática para garantizar esos derechos. | Vigente — **ese mandato legal nunca se cumplió** |
| CRBV art. 48 | Secreto e inviolabilidad de las comunicaciones privadas en todas sus formas. | Vigente |
| CRBV art. 117 | Derecho del consumidor a información **adecuada y no engañosa** sobre el contenido y características de bienes y servicios. | Vigente — base del riesgo publicitario |

**Punto clave:** el art. 28 aplica a registros **privados**, no solo públicos. Es el gancho
por el que un visitante o un usuario final puede reclamar acceso o supresión a Higerotech
sin que exista ninguna ley de datos. La vía procesal es la **acción de habeas data** ante la
Sala Constitucional del TSJ (y amparo constitucional), no un procedimiento administrativo.

### 1.2 ¿Existe ley general de protección de datos? — NO

Verificado en tres fuentes independientes:

- **DLA Piper, Data Protection Laws of the World — Venezuela:** *"There is no specific
  legislation about data privacy or data protection in Venezuela."* Confirma además, punto
  por punto: **no** hay autoridad nacional de protección de datos; **no** hay obligación de
  registrarse ante ninguna autoridad; **no** hay obligación legal de designar DPO; **no** hay
  obligación legal de notificar una brecha.
- **Transparencia Venezuela** y **Espacio Público** (ONGs venezolanas): coinciden en que no
  existe ley que resguarde los datos personales y que la protección es constitucional y
  jurisprudencial.
- **IAPP** (análisis de la brecha de Movistar Venezuela, ~3,25 millones de afectados, abril
  de 2025): describe la regulación como *"scattered"* / fragmentada, y señala que tras la
  brecha quedaron sin respuesta incluso las preguntas básicas sobre si existía obligación
  legal de notificar.

**Estado legislativo.** Los esfuerzos para aprobar una Ley de Protección de Datos y Habeas
Data **cesaron en 2005**. `<SIN VERIFICAR: no encontré, a 2026-09-16, ningún proyecto de ley
general de protección de datos personales en trámite activo en la Asamblea Nacional. Los
resultados que aparecen en buscadores bajo títulos como "La Ley de Protección de Datos
Personales en Venezuela" son contenido comercial de proveedores, no norma vigente.>`

> **Trampa documentada.** Circula en blogs de proveedores de cookie-consent la idea de que
> Venezuela tiene una "LOPD" con reglas de cookies. **No existe.** No hay LOPD venezolana, no
> hay directiva ePrivacy aplicable y no hay obligación local de banner de cookies. Cualquier
> política que invoque una "LOPD venezolana" está citando una norma inexistente.

### 1.3 Jurisprudencia vinculante: el sustituto de la ley

En ausencia de ley, la **Sala Constitucional del TSJ** construyó el derecho por sentencias.
Línea verificada:

| Sentencia | Año | Aporte |
|---|---|---|
| Nos. 1048, 1050, 1053 | 2000 | Primeras construcciones del habeas data sobre el art. 28 CRBV |
| No. 4975 | 2005 | Giro hacia la **autodeterminación informativa**, combinando arts. 28 y 60 |
| No. 1281 | 2006 | Desarrollo del procedimiento de habeas data |
| **No. 1318** | **4 de agosto de 2011** (Sala Constitucional, ponente Carmen Zuleta de Merchán) | Visión integradora: reconoce el **derecho fundamental a la protección de datos personales** derivado de los arts. 20, 28, 60 y 147 CRBV y establece **principios** de tratamiento aplicables a entidades públicas **y privadas**. El caso versaba sobre acceso indiscriminado a información bancaria |
| No. 1335 / No. 1881 | 2011 | Continuidad de la línea |

**Principios establecidos por la Sentencia 1318/2011.** DLA Piper los resume como **nueve
principios**, incluyendo *libre voluntad* (consentimiento), *legalidad*, *limitación de la
finalidad*, *seguridad* y *responsabilidad* (accountability).
`<SIN VERIFICAR: no pude abrir el texto íntegro de la sentencia en historico.tsj.gob.ve —
el servidor presenta certificado autofirmado y WebFetch lo rechaza. La enumeración literal y
completa de los nueve principios debe confirmarse contra el texto original antes de citarla
en un documento público. La existencia, fecha, número y carácter vinculante del criterio sí
están verificados.>`

**Consecuencia práctica:** aunque no haya ley, hay un estándar exigible judicialmente que se
parece, en sus principios básicos, a los de una ley de datos moderna: finalidad, calidad,
consentimiento, seguridad, responsabilidad. Una política de privacidad redactada sobre esos
principios es defendible en Venezuela y además compatible con GDPR/LGPD. Esto es una buena
noticia: **no hace falta elegir entre "cumplir Venezuela" y "cumplir GDPR"**.

### 1.4 Ley Especial contra los Delitos Informáticos

**Gaceta Oficial N° 37.313 del 30 de octubre de 2001.** Es la norma venezolana con **más
mordida real** en materia de datos, porque es penal, no administrativa.

| Art. | Delito | Pena |
|---|---|---|
| 6 | Acceso indebido a sistema que use tecnologías de información | Prisión 1–5 años + multa 10–50 UT |
| 7 | Sabotaje o daño a sistemas | Prisión 4–8 años + multa 400–800 UT |
| 8 | Sabotaje o daño **culposo** (negligencia) | Pena del art. 7 reducida entre 1/2 y 2/3 |
| 11 | Espionaje informático | Prisión 4–8 años + multa 400–800 UT |
| 12 | Falsificación de documentos (electrónicos) | Prisión 3–6 años + multa 300–600 UT |
| 13 | Hurto mediante tecnologías de información | Prisión 2–6 años + multa 200–600 UT |
| 14 | Fraude informático | Prisión 3–7 años + multa 300–700 UT |
| 15 | Obtención indebida de bienes o servicios (uso de tarjeta inteligente ajena) | Prisión 2–6 años + multa 200–600 UT |
| 16 | Manejo fraudulento de tarjetas inteligentes o instrumentos análogos | Prisión 5–10 años + multa 500–1.000 UT |
| **20** | **Violación de la privacidad de la data o información de carácter personal** — apoderarse, utilizar, modificar o eliminar, sin consentimiento del dueño, data personal de otro incorporada en un computador o sistema | **Prisión 2–6 años + multa 200–600 UT** |
| 21 | Violación de la privacidad de las comunicaciones | Prisión 2–6 años + multa 200–600 UT |
| **22** | **Revelación indebida de data o información de carácter personal** — revelar, difundir o ceder, en todo o en parte, hechos descubiertos, imágenes, audio o data obtenida por los medios de los artículos anteriores | **Prisión 2–6 años + multa 200–600 UT**. `<SIN VERIFICAR: la existencia y el alcance de la agravante (lucro o perjuicio a tercero) — confirmar contra el texto de la Gaceta>` |
| 25 | Apropiación de propiedad intelectual | Prisión 1–5 años + multa 100–500 UT |
| 26 | Oferta engañosa (de bienes o servicios por medios tecnológicos) | Prisión 1–5 años + multa 100–500 UT |

**Lectura del riesgo para Higerotech:**

- **Arts. 20 y 22 son el riesgo penal de un contratista de software.** Un desarrollador con
  credenciales de producción de un cliente que extrae, copia o comparte un dump de datos de
  usuarios finales — incluso "para depurar en local" — encaja en el art. 20, y si lo comparte
  con un tercero (un LLM en la nube, un compañero, un repositorio) encaja en el art. 22.
  **Esto es lo que debe prohibir explícitamente la política interna y el DPA**, y es el
  argumento técnico-legal más fuerte para exigir datos sintéticos o anonimizados en entornos
  no productivos.
- **Art. 26 (oferta engañosa)** cubre expresamente promesas hechas "mediante el uso de
  tecnologías de información" — es decir, **la propia landing**. Relevante para las cifras de
  disponibilidad y las declaraciones de cumplimiento (ver §5.4).
- **La multa es simbólica; la prisión no.** La Unidad Tributaria está en **Bs. 43**
  (Gaceta Oficial N° 43.140 del 2 de junio de 2025, Providencia SNAT/2025/000048). 600 UT ≈
  Bs. 25.800 ≈ **USD 260** al tipo de cambio de referencia. Nadie se blinda contra esa multa;
  se blinda contra el proceso penal y contra la responsabilidad civil derivada.

### 1.5 Otras normas venezolanas relevantes

| Norma | Referencia | Qué aporta al caso Higerotech |
|---|---|---|
| **Ley sobre Mensajes de Datos y Firmas Electrónicas** | Decreto-Ley N° 1.204, **Gaceta Oficial N° 37.148 del 28 de febrero de 2001** | **Habilita la aceptación electrónica de términos.** Art. 4: los mensajes de datos tienen la **misma eficacia probatoria** que la ley otorga a los documentos escritos. Base legal para que un "acepto" por correo, un clic o un WhatsApp valga como consentimiento contractual en Venezuela. Su promoción y evacuación como prueba sigue el régimen de la prueba libre del CPC |
| **Ley Sobre Protección a la Privacidad de las Comunicaciones** | Sancionada el **26 de julio de 1992** | Protege privacidad, confidencialidad, inviolabilidad y secreto de las comunicaciones entre dos o más personas. Refuerza la prohibición de interceptar tráfico o mensajería de usuarios de sistemas desarrollados por Higerotech |
| **Ley Orgánica de Telecomunicaciones** | Reforma en Gaceta Oficial; CONATEL como autoridad | Art. 12: derecho del usuario al **secreto e inviolabilidad de sus telecomunicaciones**, salvo casos autorizados por la Constitución. Higerotech **no** es operador de telecomunicaciones y **no** requiere habilitación administrativa por publicar una web ni por desarrollar software — conviene no dar pie a interpretar lo contrario en la política |
| **Ley de Infogobierno** | **Gaceta Oficial N° 40.274 del 17 de octubre de 2013** | Aplica a **órganos y entes del Poder Público** (nacional, estadal, municipal), BCV, universidades públicas. **No obliga a Higerotech como empresa privada**, pero **sí condiciona cualquier venta al Estado venezolano**: prioridad de tecnologías libres, soberanía tecnológica, y requisitos sobre el software que se entrega. Si el owner quiere vender al sector público, esto es un documento anexo aparte |
| **LOPNNA** | Ley Orgánica para la Protección de Niños, Niñas y Adolescentes, art. 65 | Prohíbe exponer o divulgar por cualquier medio la **imagen** de un NNA contra su voluntad o la de sus representantes, y prohíbe expresamente divulgar datos, información o imágenes que permitan la **identificación directa o indirecta** de un NNA sujeto activo o pasivo de hechos punibles. **Es infracción sancionable.** Consecuencia: si una aplicación desarrollada por Higerotech puede tener usuarios menores de edad (e-commerce, pasarelas), hay que documentar restricción de edad y prohibición de tratamiento de datos de menores en el DPA y en los términos |
| **Ley de Instituciones del Sector Bancario** | Decreto-Ley N° 1.402, **Gaceta Oficial Extraordinaria N° 6.154 del 13 de noviembre de 2014**; art. 89 sobre secreto bancario | **Secreto bancario.** La reforma amplió los supuestos de levantamiento y **aumentó las penas por delitos financieros, incluyendo el hurto de información de clientes**. El proveedor tecnológico que accede a información de clientes de un banco queda de hecho dentro del perímetro del secreto bancario por vía contractual |
| **Ley Orgánica de Precios Justos** | Decreto con Rango, Valor y Fuerza de Ley; **SUNDDE** creada en su art. 10; promulgación 23 de enero de 2014 | Régimen de protección al usuario vigente (sustituyó a INDEPABIS y SUNDECOP). Protege contra **publicidad falsa, engañosa o abusiva** y métodos comerciales desleales. Incumplimientos formales: **multa de 500 a 10.000 UT** más cierre de establecimiento por 48 h. **Prisión de 2 a 6 años** para quien difunda noticias falsas para alterar precios |
| **Proyecto de Ley de Derechos Socioeconómicos** | Aprobado en **primera discusión el 22 de enero de 2026** por la Asamblea Nacional | **A vigilar.** Derogaría la Ley Orgánica de Precios Justos y reconfiguraría la SUNDDE, creando un Sistema Nacional de Observación de Precios (arts. 45 y ss.), manteniendo control de precios en "circunstancias extraordinarias" (art. 49) y prisión de 2 a 5 años por violarlo (art. 73). **No es ley todavía** — la política no debe citarlo como norma vigente |
| **IGTF** | Ley de Impuesto a las Grandes Transacciones Financieras; alícuota en bolívares fijada en **0 %** por Decreto N° 4.972, **Gaceta Oficial Extraordinaria N° 6.821 del 12 de julio de 2024**; 3 % subsiste en divisas/criptoactivos y para los sujetos de los numerales 5 y 6 del art. 4 | La landing vende un "motor IGTF". **La alícuota en bolívares está hoy en 0 %**: una afirmación de producto que no diga "según la alícuota vigente" envejece mal y es publicidad potencialmente inexacta |
| **Consejo Nacional de Ciberseguridad** | Creado en **agosto de 2024** | Es el único órgano nuevo en la materia. **No es una autoridad de protección de datos** y no está claro su rol en aplicación de políticas de datos. No presentarlo como regulador de datos |

### 1.6 SUDEBAN — el bloque de mayor riesgo regulatorio

Este es el hallazgo más importante de la investigación y **contradice parcialmente lo que
afirma la landing**.

#### Qué es realmente la Resolución 001-21

| Dato | Valor verificado |
|---|---|
| Nombre exacto | **Normas que Regulan los Servicios de Tecnología Financiera (FINTECH)** |
| Emisor | SUDEBAN — Superintendencia de las Instituciones del Sector Bancario |
| Fecha de la resolución | **4 de enero de 2021** |
| Publicación | **Gaceta Oficial N° 42.151 del 17 de junio de 2021** (hubo reimpresión posterior) |
| Objeto | Regular los servicios financieros prestados mediante nuevas tecnologías por las **Instituciones de Tecnología Financiera del Sector Bancario (ITFB)**, su organización, operación y funcionamiento, y lo que las instituciones bancarias deben considerar **al contratar o establecer alianzas estratégicas con ellas** |

**No es una norma genérica de "auditoría inmutable y AML/CFT" para proveedores de software.**
Es un **régimen de autorización previa**. Lo que exige:

- **ITFB** = *"toda persona jurídica de carácter público o privado, nacional o extranjera,
  **autorizada por SUDEBAN** para prestar servicios financieros contemplados mediante nuevas
  tecnologías."*
- Requisitos verificados para autorizarse: autorización de SUDEBAN **previa opinión
  vinculante del OSFIN**; constituirse como **sociedad anónima**; **mínimo cinco
  accionistas**; **domicilio en el país**; capital mínimo fijado por SUDEBAN, totalmente
  pagado en efectivo; iniciar operaciones dentro de **120 días hábiles bancarios** desde la
  autorización; constituir **fianza de fiel cumplimiento de mínimo EUR 20.000**.
- Obligaciones de las ITFB: manuales de organización y procedimientos, controles de riesgo
  integral, **políticas AML/CFT**, unidades de prevención para ciertas actividades.
- **Art. 28:** las ITFB están obligadas a proteger la privacidad y *"en ningún caso podrán
  dar información a terceras personas de sus actividades, operaciones o servicios."*
- Los **modelos de contrato con clientes** deben ser *"previamente evaluados y aprobados por
  la SUDEBAN"*.

`<SIN VERIFICAR: el articulado detallado sobre tercerización, localización geográfica de la
información, pistas de auditoría inmutables, reporte de incidentes y régimen sancionatorio
específico no pude confirmarlo con cita de artículo. Las fuentes secundarias abiertas
(Acceso a la Justicia, Interjuris) declaran expresamente que esos puntos no aparecen
desarrollados en el texto que resumen. Antes de publicar cualquier afirmación sobre
"cumplimiento de la Resolución 001-21" hay que leer el texto íntegro de la Gaceta Oficial
N° 42.151.>`

#### Riesgo concreto: la afirmación de la landing

`index.html` dice hoy, en la sección de cumplimiento, que la Resolución *"001-21 exige
auditoría inmutable, prevención AML/CFT y manuales de riesgo"* y ofrece **"Cumplimiento
SUDEBAN"** como servicio, junto a **"AML/CFT con IA"** y *"modelos AML/CFT que perfilan
transacciones en tiempo real"*.

Tres problemas distintos:

1. **Riesgo de actividad no autorizada.** Si Higerotech **presta** un servicio financiero
   mediante tecnología (procesar pagos, almacenar dinero, operar el motor AML/CFT como
   servicio), entra en el ámbito de la 001-21 y necesitaría **autorización de SUDEBAN como
   ITFB** — sociedad anónima, cinco accionistas, capital mínimo, fianza. Un owner único no
   cumple el requisito de cinco accionistas. Si en cambio **desarrolla y entrega software**
   que el banco opera bajo su propia responsabilidad, la 001-21 recae sobre el banco y
   Higerotech es un proveedor ordinario. **La frontera entre esos dos negocios tiene que
   quedar escrita**, y hoy la landing la difumina.
2. **Riesgo de publicidad inexacta.** Decir "Cumplimiento SUDEBAN" puede leerse como
   "estamos autorizados/certificados por SUDEBAN". No hay certificación de ese tipo para
   proveedores. Redacción segura: *"desarrollamos sistemas cuyos controles están diseñados
   para que la institución regulada pueda demostrar su cumplimiento ante SUDEBAN"*.
3. **Atribución incorrecta del contenido de la norma.** La 001-21 es el régimen FINTECH/ITFB.
   Las exigencias de tecnología de la información, seguridad, contingencias y comunicaciones
   para entidades supervisadas viven además en otros instrumentos: la **Resolución 641.10 —
   Normas que regulan el uso de los servicios de la Banca Electrónica** (2010), que remite a
   la **Circular SBIF-DSB-IO-GGT-GRT-01907 del 30 de enero de 2008** (Normas de Tecnología de
   la Información, servicios financieros desmaterializados, banca electrónica virtual y en
   línea). Las infracciones a la 641.10 se sancionan conforme a la Ley General de Bancos
   (art. 363 en la referencia consultada), **sobre la institución bancaria**, no sobre el
   proveedor.

#### Cómo se traslada el riesgo SUDEBAN al proveedor

No por norma directa, sino **por cascada contractual**: el banco supervisado está obligado a
controlar a su proveedor, y lo hace imponiéndole en el contrato secreto bancario, derechos de
auditoría, pistas de auditoría, gestión de incidentes, restricciones de acceso y a veces
localización de datos. **Por eso el documento crítico no es la política de privacidad, sino
el MSA/DPA de Higerotech**: si no lleva topes de responsabilidad e indemnidades, Higerotech
firmará lo que el banco le ponga delante, con responsabilidad ilimitada.

`<SIN VERIFICAR: SUDEASEG (seguros). No investigué su normativa de tercerización tecnológica.
Si Higerotech vende al sector asegurador, es un vacío que hay que cerrar.>`

### 1.7 Régimen sancionatorio venezolano — resumen

| Materia | Órgano | Tipo de sanción | Cuantía / base |
|---|---|---|---|
| Datos personales | **Ninguno** (no hay autoridad) | Judicial: habeas data / amparo (arts. 28 y 60 CRBV) → órdenes de acceso, rectificación o destrucción; daños y perjuicios por vía civil | No hay multa administrativa tarifada |
| Delitos informáticos | Ministerio Público / tribunales penales | **Prisión** 1–10 años según el tipo + multa en UT | Multas 10–1.000 UT; **UT = Bs. 43** (G.O. 43.140, 2-jun-2025) |
| Protección al usuario / publicidad | **SUNDDE** | Multa + cierre temporal; penal en supuestos graves | 500–10.000 UT; cierre 48 h |
| Sector bancario | **SUDEBAN** | Multa, suspensión, revocatoria de autorización | Recae sobre la **institución bancaria** o la ITFB autorizada |
| Sector público (Infogobierno) | Órganos de control | Administrativa | Solo si Higerotech contrata con el Estado |
| IA | **Ninguno** — el Código de Ética no prevé sanciones | — | — |

### 1.8 Inteligencia artificial en Venezuela

| Instrumento | Estado verificado | Efecto |
|---|---|---|
| **Código de Ética para el Desarrollo y Aplicación Responsable de la Inteligencia Artificial** | Publicado el **19 de febrero de 2026** por el Ministerio del Poder Popular para Ciencia y Tecnología (Dirección General de Desarrollo y Aplicación de IA). `<SIN VERIFICAR: si se publicó en Gaceta Oficial>` | **Soft law, no vinculante, sin sanciones.** Nueve principios: IA humanística, equidad/igualdad/no discriminación, responsabilidad ambiental, seguridad, privacidad, transparencia, responsabilidad (rendición de cuentas), ciencia abierta, excelencia. Dirigido a **desarrolladores, proveedores e implementadores** de IA en Venezuela |
| **Anteproyecto de Ley de Inteligencia Artificial** | Fechado 13 de noviembre de 2024; **aprobado en primera discusión el 19 de noviembre de 2024**; sin avance formal desde entonces. **No es ley.** | Crearía la **Agencia Nacional de Inteligencia Artificial** (instituto público adscrito al ministerio de ciencia y tecnología) con potestad para llevar un **registro nacional de proveedores de IA**, dictar normas, supervisar y **sancionar**. Cuatro niveles de infracción administrativa con multas graduadas, más penas de **1 a 7 años de prisión** por deepfakes engañosos, revelación no autorizada de datos y amenazas a la seguridad nacional. Obligaciones para desarrolladores y proveedores: equidad en la recolección de datos, datos de entrenamiento representativos, medidas de seguridad, garantías de calidad del dato, transparencia e información de riesgos al usuario |

**Oportunidad, no solo riesgo.** El Código de Ética de febrero de 2026 es reciente y no
vinculante: una **Política de IA Responsable** publicada por Higerotech que se alinee
explícitamente con esos nueve principios es un diferenciador comercial baratísimo y deja a
la empresa preparada si el anteproyecto se aprueba (donde el **registro de proveedores de
IA** sería una obligación directa sobre Higerotech, no sobre sus clientes).

---

## 2. Marcos extraterritoriales con riesgo real

> **Nivel de verificación.** Esta sección se apoya en **texto literal leído en fuente
> primaria** (EUR-Lex, legislation.gov.uk, leginfo.legislature.ca.gov, Planalto,
> diputados.gob.mx, InfoLeg, gestor normativo de Función Pública, LeyChile, PCI SSC) salvo
> donde se indique `[secundaria]` o `<SIN VERIFICAR>`.

### 2.1 Tabla de aplicabilidad

| Marco | ¿Aplica a Higerotech? | Umbral concreto (artículo) | Mitigación | Sanción máxima |
|---|---|---|---|---|
| **RGPD (UE) 2016/679** | **NO por el sitio web.** **SÍ como encargado** si el cliente hace targeting a la UE | Art. 3.2(a) oferta de bienes o servicios / (b) monitorización. **Recital 23: la mera accesibilidad del sitio, el correo o el uso de una lengua del tercer país son insuficientes.** Recital 24 define monitorización como *tracking* y perfilado | Cláusula de ámbito territorial de la oferta; ausencia por diseño de los factores del EDPB; DPA del art. 28; asignación escrita de roles | **Art. 83.5: 20.000.000 EUR o 4 %** del volumen de negocio anual mundial, el mayor (principios, derechos arts. 12–22, transferencias arts. 44–49). **Art. 83.4: 10.000.000 EUR o 2 %** (arts. 8, 11, 25–39, 42, 43 — **el art. 27 y el art. 28 caen aquí**) |
| **Representante en la UE (art. 27)** | **Moot: solo se activa *"where Article 3(2) applies"*** | Art. 27.1. **La excepción del 27.2(a) es más estrecha de lo que parece:** el EDPB sostiene que un tratamiento *"can only be considered as 'occasional' if it is not carried out regularly, and occurs outside the regular course of business"* | **La defensa correcta es que el art. 3.2 no se activa, NO que la excepción aplica.** Registrar visitantes de forma continua **no** sería "occasional" | Nivel del art. 83.4. Precedente: la autoridad neerlandesa multó a Locatefamily.com con **525.000 EUR solo por no designar representante** `[secundaria: IAPP]` |
| **UK GDPR + DUAA 2025** | **NO** | Art. 3.2 UK GDPR (idéntico, con "the United Kingdom"). **ICO:** *"there must be evidence that the organisation intends to specifically target customers who are inside the UK… it's not enough just to show that a website is accessible in the UK"*. En el art. 27 UK el apartado 3 está omitido: el representante debe estar en el RU | Matiz favorable de la ICO: *"A non-UK processor won't be automatically covered just because it acts for a controller in the UK… we'd take action against the controller rather than the processor"* — más benigno que la lectura del EDPB | **DPA 2018 s.157(5): GBP 17.500.000 o 4 %**, el mayor (*higher maximum amount*); **s.157(6): GBP 8.700.000 o 2 %** (*standard*) |
| **LGPD Brasil (Lei 13.709/2018)** | **Riesgo bajo-medio. Es el umbral más amplio de los diez** | **Art. 3 III + §1º:** aplica si los datos *"tenham sido coletados no território nacional"*, y *"consideram-se coletados no território nacional os dados pessoais cujo titular nele se encontre no momento da coleta"*. **Puramente locacional: no exige intención ni targeting.** El art. 3 II habla de *"indivíduos"* (personas físicas), no de empresas | **Mitigante fáctico decisivo: en la ruta de producción Higerotech no recoge la IP** (ver §2.3). Quien la recoge es Cloudflare, con su propio análisis de ámbito. No-targeting afirmativo: sin portugués, sin BRL, sin prospección a Brasil | **Art. 52 II: multa simple de hasta 2 % del *faturamento* en Brasil** del último ejercicio, excluidos tributos, **limitada a R$ 50.000.000 por infracción**; más multa diaria, publicización, bloqueo, eliminación y —por la Lei 13.853/2019— **suspensión o prohibición del tratamiento (incisos X a XII)**. Autoridad: **ANPD**; dosimetría en la **Resolução CD/ANPD nº 4 de 24-feb-2023**. Nota económica: el 2 % se calcula sobre facturación **en Brasil**; sin facturación allí, la base es casi cero y **el riesgo real son las sanciones no pecuniarias** |
| **Colombia — Ley 1581/2012** | **NO. Es el umbral más estrecho de los diez** | **Art. 2:** aplica al tratamiento *"efectuado en territorio colombiano o cuando al Responsable… no establecido en territorio nacional le sea aplicable la legislación colombiana **en virtud de normas y tratados internacionales**"*. **No hay regla de targeting ni de "oferta de bienes o servicios".** La accesibilidad del sitio es jurídicamente irrelevante | **Hallazgo comercial fuerte y verificado — art. 2, literal b):** el régimen **no se aplica** *"a las bases de datos y archivos que tengan por finalidad la seguridad y defensa nacional, así como la **prevención, detección, monitoreo y control del lavado de activos y el financiamiento del terrorismo**"* (con el matiz del parágrafo: los principios siguen aplicando). Para clientes colombianos: **contrato de transmisión del Decreto 1377/2013**. **No someter el MSA a ley colombiana**, para no abrir el segundo supuesto del art. 2 por vía convencional | **Art. 23(a): multas de hasta 2.000 SMMLV**, sucesivas mientras persista el incumplimiento; (b) suspensión hasta 6 meses; (c) cierre temporal; (d) cierre inmediato y definitivo si hay datos sensibles. Solo aplican a personas de naturaleza privada. **SMMLV 2026 = $1.750.905 COP ⇒ tope $3.501.810.000 COP** `<estabilidad jurídica de esa cifra: el Decreto 159 del 19-feb-2026 fue objeto de litigio — SIN VERIFICAR más allá de esto>`. Autoridad: **SIC** (art. 19) |
| **Colombia — RNBD** | **NO es sujeto obligado** | Obligados a inscribir: responsables, sociedades y ESAL con **activos totales superiores a 100.000 UVT**, y personas jurídicas públicas (Circular Externa 003 de 2018 de la SIC; Decreto 090 del 18-ene-2018 eliminó la obligación para personas naturales y entidades por debajo del umbral). **UVT 2026 = $52.374 COP ⇒ umbral $5.237.400.000 COP** | No registrarse y **documentar por qué** | — |
| **México — LFPDPPP** | **NO** | **Ley vigente: nueva LFPDPPP, "Nueva Ley publicada en el DOF el 20 de marzo de 2025", TEXTO VIGENTE, última reforma DOF 14-11-2025.** En vigor desde el **21 de marzo de 2025**; **abroga** la de 2010. **Art. 1: *"de observancia general en todo el territorio nacional"* — la nueva ley NO contiene cláusula de extraterritorialidad por targeting.** Anclaje territorial puro | Cláusula de encargado; confidencialidad del art. 20; y **cláusula que instrumente el art. 35**: el responsable *"deberá comunicar"* al tercero receptor el aviso de privacidad y las finalidades, y *"el tercero receptor asumirá las mismas obligaciones que correspondan al responsable que transfirió los datos"* | **Art. 59: multa de 100 a 160.000 UMA** (fracciones II a VII del art. 58); **de 200 a 320.000 UMA** (fracciones VIII a XVIII); multa adicional por reiteración; **hasta el doble con datos sensibles**. **UMA 2026 = $117,31 diarios ⇒ topes $18.769.600 / $37.539.200 / $75.078.400 MXN**. Delitos: **art. 62** (3 meses a 3 años de prisión a quien, autorizado y con ánimo de lucro, provoque una vulneración de seguridad), **art. 63** (6 meses a 5 años por tratar datos mediante engaño con fin de lucro), **art. 64** (penas duplicadas con datos sensibles) |
| **México — autoridad** | — | **Art. 2, fr. XV: *"Secretaría: Secretaría Anticorrupción y Buen Gobierno"***. Todas las facultades de vigilancia, verificación, resolución y sanción son de "la Secretaría" (arts. 38, 39, 54, 56, 57, 59). **El INAI se extinguió** (transitorios). Contra sus resoluciones procede **juicio de amparo** (art. 51) | — | **Corrección importante: "Transparencia para el Pueblo" NO es la autoridad de datos personales en posesión de particulares** — es el órgano desconcentrado de la SABG que asumió las funciones de transparencia y acceso a la información del INAI `[secundaria: gob.mx]` |
| **Argentina — Ley 25.326** | **NO se aplica a Higerotech. El problema es el inverso: art. 12** | **Arts. 1 y 2: sin cláusula de extraterritorialidad ni de targeting.** Dos rasgos propios: el objeto son archivos y bancos de datos *"privados destinados a dar informes"*, y el art. 2 define dato personal como información referida a personas físicas **"o de existencia ideal"** — **único de los diez marcos que protege también a personas jurídicas**, relevante en un proyecto B2B | **Art. 12.1: *"Es prohibida la transferencia de datos personales… con países… que no proporcionen niveles de protección adecuados"*. Venezuela NO figura en la lista de países adecuados del art. 3 de la Disposición 60-E/2016** (UE/EEE, Suiza, Guernsey, Jersey, Isla de Man, Feroe, Canadá sector privado, Andorra, Nueva Zelanda, Uruguay, Israel). **Mitigación: tener pre-firmado el Anexo II de la Disposición 60-E/2016** (contrato modelo de prestación de servicios). Excepción utilizable: **art. 12.2(c), transferencias bancarias o bursátiles** *"en lo relativo a las transacciones respectivas"*. Alternativa técnica más fuerte: que los datos no salgan de Argentina (acceso remoto sin copia local) | **Art. 31: multa de $1.000 a $100.000 ARS** por infracción. **Resolución AAIP 126/2024** (vigente desde el 1-jun-2024): leves hasta $80.000, graves $80.001–$90.000, muy graves $90.001–$100.000, **tope acumulado $50.000.000 ARS**, reducción del 50 % por pago voluntario en 20 días. La Res. AAIP 179/2025 **no** actualizó montos. **Es la sanción más baja de los diez marcos por varios órdenes de magnitud: el riesgo argentino es de bloqueo contractual, no de multa** |
| **Argentina — reforma** | **NO hay ley nueva a 2026-09-16** | El proyecto del Ejecutivo se remitió por el **Mensaje 87/2023** (no el 42/2023) y perdió estado parlamentario. En 2026 hay varios proyectos de reforma integral en el Congreso — **1751-D-2026** (dip. Yeza) y **3397-D-2026** (dip. Rossi) entre otros `<números de expediente y fechas: VERIFICACIÓN PARCIAL, fuentes secundarias>` | Vigilar | — |
| **Chile — Ley 21.719** | **NO aún, pero es el marco con la puerta de entrada más peligrosa** | Promulgada el 25-nov-2024, publicada el 13-dic-2024. **Artículo primero transitorio: entra en vigencia *"el día primero del mes vigésimo cuarto posterior a la publicación"* ⇒ 1 de diciembre de 2026.** **Art. 1° bis:** (a) establecido o constituido en Chile; (b) mandatario de un responsable chileno; (c) **oferta de bienes o servicios a titulares en Chile o monitorización de su comportamiento *"incluyendo su análisis, rastreo, perfilamiento o predicción de comportamiento"*** — más amplio que el art. 3.2(b) GDPR; **e inciso final: también aplica al responsable *"al que, sin estar establecido en el territorio nacional, le resulte aplicable la legislación nacional **a causa de un contrato** o del derecho internacional"*** | **🔴 PRIORIDAD 1: no aceptar ley aplicable ni foro chilenos en ningún MSA.** Basta una cláusula de ley chilena para que Higerotech quede **por su propia firma** dentro del ámbito completo de la ley. Ninguno de los otros nueve marcos tiene una puerta tan puramente contractual. Además: cláusula de mandatario (no de responsable), no-targeting a Chile, y preparar addendum de garantías del art. 27 en cuanto la Agencia emita instrucciones | Escala del art. 35: **leves hasta 5.000 UTM, graves hasta 10.000 UTM, gravísimas hasta 20.000 UTM**; recargo del 50 % si no se implementan las medidas de la Agencia en 60 días; **hasta el triple por reincidencia**. Tope alternativo del 2 %/4 % de ingresos **solo para grandes empresas**. **UTM sept-2026 = $71.721 CLP ⇒ $358.605.000 / $717.210.000 / $1.434.420.000 CLP**, y hasta **$4.303.260.000** con reincidencia `[escala arts. 33-40 vía informe BCN: el XML de LeyChile se trunca antes]`. Y el **Registro Nacional de Sanciones y Cumplimiento** es público: para quien vende confianza, el daño reputacional excede la multa |
| **Chile — dos mitigantes verificados** | — | **Artículo sexto transitorio:** *"Durante los primeros doce meses luego de la entrada en vigencia de esta ley"*, para **empresas calificadas como de menor tamaño** (Ley 20.416), *"la Agencia **podrá** aplicar como sanción una amonestación por escrito"*. ⇒ ventana de gracia discrecional. Y el tope porcentual del 2 %/4 % no alcanza a las empresas de menor tamaño | — | `<Tramos exactos de la Ley 20.416 que definen "empresa de menor tamaño": SIN VERIFICAR>` |
| **Chile — calendario incierto** | — | **El 1 de septiembre de 2026 el Gobierno ingresó al Senado un proyecto que postergaría la vigencia al 1 de diciembre de 2027** y reforzaría la Agencia (de 3 a 5 consejeros, dedicación exclusiva). **Está en tramitación: la ley vigente dice 1-dic-2026 y no debe citarse otra fecha como cierta** | Planificar para el 1-dic-2026 y celebrar si se posterga | — |
| **CCPA / CPRA (California)** | **NO como *"business"*. SÍ, potencialmente, como *"service provider"* — y ese rol NO tiene umbral** | **§ 1798.140(d)(1):** *"does business in the State of California"* **y** uno de: **(A)** ingresos brutos anuales superiores a **USD 25.000.000**, *"as adjusted"* (**cifra vigente: USD 26.625.000**, efectiva 1-ene-2025; el ajuste del § 1798.199.95(d) es bienal en años impares, próximo 1-ene-2027); **(B)** compra, venta o **compartición** de datos de **100.000 o más** consumidores u hogares (la CPRA subió el umbral de 50.000 a 100.000 y cambió el verbo: ya no cuenta el mero *"receives for commercial purposes"* ni los *devices*); **(C)** ≥ **50 %** de los ingresos por vender o compartir datos. Higerotech falla los tres | **El DPA de service provider es el entregable crítico.** § 1798.140(ag)(1) exige un contrato escrito que prohíba: (A) vender o compartir; (B) retener, usar o divulgar para cualquier fin distinto de las *business purposes* **enumeradas en el contrato**; (C) usarlos *"outside of the direct business relationship"*; (D) **combinarlos** con datos de otros. Más § 1798.140(ag)(2): **notificar al cliente** cada subencargado y vincularlo por contrato escrito a todas las obligaciones del (ag)(1) — **esto alcanza a Cloudflare y a cualquier API de LLM**. Más § 1798.100(d) y el reglamento **Cal. Code Regs. tit. 11 § 7051(a)**. **Si el contrato no cumple, la relación deja de ser de service provider y la transferencia se recalifica como *sale/share***, con todo el aparato de opt-out | **§ 1798.155(a): USD 2.500** por violación y **USD 7.500** por violación intencional o que involucre datos de menores de 16 años (**cifras ajustadas vigentes: USD 2.663 y USD 7.988**). **El § 1798.155 alcanza expresamente a *"business, service provider, contractor, or other person"* ⇒ Higerotech como service provider es sancionable directamente.** No hay tope agregado: el multiplicador es el número de violaciones. Acción civil del **Attorney General** (§ 1798.199.90). **Acción privada solo por brechas: § 1798.150(a)(1), USD 100–750 por consumidor por incidente (ajustado: USD 107–799)**, si hubo exfiltración de datos no cifrados por incumplir el deber de seguridad razonable. Autoridades: **CPPA** y **AG de California** |
| **CCPA — reglamentos ADMT** | Obligan al **cliente**, no a Higerotech — pero se traslada por contrato | Paquete de ADMT, *risk assessments* y *cybersecurity audits* **efectivo el 1 de enero de 2026** (Cal. Code Regs. tit. 11, div. 6, art. 11 §§ 7200 ss.; art. 10 §§ 7150, 7155; definiciones § 7001). Aplica al *"business that uses ADMT to make a significant decision concerning a consumer"*; **"significant decision" incluye expresamente *"the provision or denial of financial or lending services"*** (§ 7001(ddd)); la publicidad quedó **excluida** en la versión final. **"Human involvement"** solo existe si el revisor (A) sabe interpretar el output, (B) revisa el output y la información relevante y **(C) tiene autoridad para tomar o cambiar la decisión** (§ 7001(e)) | **Los businesses siguen siendo responsables aunque usen herramientas ADMT de terceros** ⇒ trasladarán la exigencia técnica por contrato. Higerotech debe poder entregar **documentación explicable** (inputs, categorías de datos que afectan el output, rol del ADMT en la decisión, logs de uso) y **propagar opt-outs en ≤15 días hábiles** | **Calendario:** cumplimiento ADMT a más tardar el **1 de enero de 2027**; *risk assessments* de actividades preexistentes documentados antes del **31 de diciembre de 2027** (§ 7155(c)), primera presentación a la CPPA el **1 de abril de 2028**; *cybersecurity audits* no antes del **1 de abril de 2028** |
| **EU AI Act — Reglamento (UE) 2024/1689, modificado por el Reglamento (UE) 2026/1744** | **NO hoy.** **SÍ** si coloca un sistema en el mercado de la Unión, lo entrega bajo marca propia, o **el output se usa en la Unión** | **Art. 2(1)(a)** providers que colocan en el mercado o ponen en servicio en la Unión *"irrespective of whether those providers are established… in a third country"*; **(b)** deployers establecidos en la Unión; **(c) *"providers and deployers… located in a third country, where the output produced by the AI system is used in the Union"*** — **el gancho extraterritorial más amplio del Reglamento: no requiere targeting.** Definiciones del art. 3: *provider* es quien desarrolla y *"places it on the market or puts the AI system into service **under its own name or trademark**"*; *deployer* quien lo usa *"under its authority"* | Entregar **bajo la marca del cliente** y dejarlo por escrito — el **art. 25(1)(a)** admite expresamente *"contractual arrangements stipulating that the obligations are otherwise allocated"*. Cláusula del **art. 25(4)**: acuerdo escrito sobre información, capacidades y acceso técnico que Higerotech pone a disposición del provider. **Cláusula de "no output en la Unión"** con notificación previa. Y **no declarar cumplimiento del AI Act** | **Art. 99.3: 35.000.000 EUR o 7 %** (prohibiciones del art. 5); **99.4: 15.000.000 EUR o 3 %** (obligaciones de providers art. 16, representantes art. 22, importadores, distribuidores, **deployers art. 26** y **transparencia del art. 50**); **99.5: 7.500.000 EUR o 1 %** (información incorrecta). **99.6: *"In the case of SMEs, including start-ups, each fine… shall be up to the percentages or amount… whichever thereof is LOWER"*** y el 99.1 obliga a los Estados a considerar *"the interests of SMEs… and their economic viability"*. **⇒ Para una microempresa la cifra operativa no es 35 M EUR sino el 7 % de su facturación.** El Reg. 2026/1744 añadió el 99.4(da) y un 99.6a que extiende la regla del importe menor a las *small mid-cap enterprises* |
| **Venezuela — Código de Ética de IA (MPPCT, 19-feb-2026)** | **SÍ, como marco voluntario de su propia jurisdicción** | Dirigido a desarrolladores, proveedores e implementadores de IA en Venezuela | Adherirse explícitamente es barato y diferenciador (ver D6, §5.1) | **Ninguna** — soft law sin sanciones |
| **Venezuela — Anteproyecto de Ley de IA** | **NO (no es ley)** | Primera discusión el 19-nov-2024, sin avance formal | Vigilar. Si se aprueba, el **registro nacional de proveedores de IA** sería obligación **directa** sobre Higerotech | Cuatro niveles de infracción administrativa + **prisión de 1 a 7 años** por deepfakes engañosos, revelación no autorizada de datos y amenazas a la seguridad nacional |
| **PCI DSS v4.0.1** | **SÍ, como TPSP y *bespoke software developer*** | **v4.0.1 publicada en junio de 2024 es la versión vigente**; v4.0 se retiró el 31-dic-2024. **No existe v4.1 ni v5.0** (la "v5.0" del roadmap es **PTS HSM**, no DSS). De los 64 requisitos nuevos, **51 eran *future-dated* y son obligatorios desde el 31 de marzo de 2025**: a 2026 no queda nada en estado de *best practice*. El estándar lista entre los TPSP a quienes *"could impact the security of the entity's cardholder data… (such as vendors providing support via remote access, and **bespoke software developers**)"* | Ver §2.5. Lo esencial: **cláusula 12.9.1** en plantilla maestra, **responsibility matrix** (12.8.5/12.9.2) por servicio, y **diseño por defecto hacia SAQ A** | **Ningún regulador.** El propio estándar: *"Whether any entity is required to comply… is at the discretion of those organizations that manage compliance programs (such as payment brands and acquirers)"*, y *"each card brand maintains its own separate compliance enforcement programs"*. Cadena real: marca → **banco adquirente** → comercio por indemnidad del merchant agreement. **Higerotech no es sancionable directamente; su exposición es indemnidad contractual** más costos de forense PFI y reemisión de tarjetas. **Cifras de esas multas: `<SIN VERIFICAR>`** — Mastercard publica su *noncompliance assessment schedule* en el SPME (ed. 3-feb-2026) pero el sitio devuelve 403; el *AIS Program Guide* de Visa no es público; **las cifras de USD 5.000–100.000/mes que circulan provienen solo de blogs de vendedores de compliance y no deben usarse** |

### 2.2 Por qué el GDPR no alcanza al sitio — y dónde está el riesgo de verdad

**Los dos gatillos del art. 3.2 fallan, y por razones distintas.**

**(a) "Oferta de bienes o servicios".** El **Recital 23** es la frase que decide el caso:

> *"Whereas the **mere accessibility** of the controller's, processor's or an intermediary's
> website in the Union, of an email address or of other contact details, **or the use of a
> language generally used in the third country where the controller is established, is
> insufficient** to ascertain such intention, factors such as the use of a language **or a
> currency** generally used in one or more Member States **with the possibility of ordering
> goods and services in that other language**, or the **mentioning of customers or users who
> are in the Union**, may make it apparent that the controller envisages offering goods or
> services to data subjects in the Union."*

Y el **EDPB, Guidelines 3/2018 v2.1**, añade lo decisivo: *"when goods or services are
inadvertently or incidentally provided to a person on the territory of the Union, the related
processing of personal data would not fall within the territorial scope of the GDPR"*.
Los factores de targeting que el EDPB toma de *Pammer/Alpenhof* (C-585/08 y C-144/09) son:
designar un Estado miembro por su nombre; pagar referenciación o campañas dirigidas a público
de la UE; naturaleza internacional de la actividad; direcciones o teléfonos para ser
contactados desde la UE; **TLD europeo o neutro (`.eu`)**; instrucciones de viaje desde
Estados miembros; **mención de clientela domiciliada en la UE**; uso de una lengua o **moneda**
de un Estado miembro; oferta de entrega en Estados miembros.

**Contraste con los hechos verificados del repositorio:**

| Factor del EDPB | Estado en `higerotech.com` |
|---|---|
| TLD | `.com` — ni `.eu` ni ningún ccTLD europeo |
| `og:locale` | `es_VE`, alternate `en_US`. **Ningún locale de la UE** |
| `hreflang` | solo `es`, `en`, `x-default`. Sin `es-ES`, `en-GB`, `de`, `fr` |
| JSON-LD | `"areaServed": {"@type":"Country","name":"Venezuela"}` |
| Moneda / precios | **ninguna** |
| Clientes de la UE mencionados | **ninguno** |
| Teléfono o dirección para la UE | ninguno |
| Campañas pagadas | ninguna |
| Copy | *"consultora AI-First del B2B venezolano"*, *"Hecho con ♥ en Venezuela"* |

El inglés es, en el contexto B2B tecnológico venezolano, *"a language generally used in the
third country where the controller is established"*, y el Recital 23 lo declara expresamente
insuficiente. Además la oferta es **B2B a personas jurídicas**, y el GDPR solo protege
personas físicas.

**(b) "Monitorización del comportamiento".** El **Recital 24** la define por *"whether natural
persons are **tracked on the internet** including potential subsequent use of… **profiling**"*,
y el EDPB precisa: *"The EDPB does not consider that any online collection or analysis of
personal data of individuals in the EU would automatically count as 'monitoring'. It will be
necessary to consider the controller's purpose… and, in particular, any subsequent behavioural
analysis or profiling techniques"*. No hay analítica, ni cookies, ni fingerprinting, ni
perfilado — **y en la ruta de producción el sitio no recoge la IP en absoluto** (§2.3). La
decisión de alcance del charter **elimina este gatillo, no lo mitiga**.

**El `localStorage` de idioma** es almacenamiento en el equipo terminal del usuario; no sale
del dispositivo ni lo trata Higerotech. Cae conceptualmente en la excepción de "estrictamente
necesario solicitado por el usuario" del art. 5(3) de la Directiva 2002/58/CE, no en el
art. 3 GDPR.

#### ⚠️ Corrección importante sobre el art. 27: la excepción NO es la defensa

Es tentador razonar "si algún día aplicara el art. 3.2, el art. 27.2(a) nos salva porque el
tratamiento es pequeño". **Es falso.** El EDPB:

> *"the EDPB considers that a processing activity **can only be considered as 'occasional' if
> it is not carried out regularly, and occurs outside the regular course of business or
> activity** of the controller or processor."*

Registrar visitantes de forma continua **no es "occasional"**, por pequeño que sea el volumen.
**La defensa correcta es que el art. 3.2 no se activa** — y por eso el art. 27 es
directamente inaplicable (*"where Article 3(2) applies"*). Además el art. 27 se aplica
**también a los encargados**, así que el escenario de la sección siguiente arrastraría la
obligación de representante.

#### El riesgo real: Higerotech como encargado de un cliente que sí hace targeting

Este es el hallazgo más importante de toda la sección, y **no se deriva del sitio web**. EDPB
Guidelines 3/2018:

> *"The EDPB considers that, **where processing activities by a controller relates to the
> offering of goods or services or to the monitoring of individuals' behaviour in the Union
> ('targeting'), any processor instructed to carry out that processing activity on behalf of
> the controller will fall within the scope of the GDPR by virtue of Art 3(2)** in respect of
> that processing."*

El **Ejemplo 20** de las Guidelines es literalmente el caso de Higerotech: una empresa
estadounidense con una app que monitoriza a personas en la UE contrata a un proveedor cloud
también estadounidense; *"This processing activity by the processor on behalf of its
controller falls within the scope of the GDPR under Art 3(2)."*

**⇒ Si Higerotech desarrolla u opera una aplicación para un cliente que ofrece servicios a
personas en la UE o monitoriza su comportamiento, Higerotech queda sujeta al GDPR
directamente como encargado.** No hay cláusula que lo evite: lo que hay que hacer es tener el
DPA del art. 28 en regla y saber que se está ahí.

#### Base legal para los logs de seguridad: art. 6.1(f) + Recital 49 + *Breyer*

El **Recital 49** es el respaldo explícito:

> *"The processing of personal data **to the extent strictly necessary and proportionate for
> the purposes of ensuring network and information security** … constitutes a legitimate
> interest of the data controller concerned. This could, for example, include preventing
> unauthorised access to electronic communications networks and malicious code distribution
> and stopping 'denial of service' attacks…"*

Y el TJUE lo confirmó en ***Breyer*, C-582/14, sentencia de 19 de octubre de 2016**, con dos
puntos aprovechables:

1. Una **IP dinámica registrada por un prestador de servicios de medios en línea constituye
   dato personal** *"in relation to that provider, **where the latter has the legal means which
   enable it to identify the data subject** with additional data which the internet service
   provider has about that person"*. **El carácter de dato personal está condicionado a que
   exista ese medio legal** — en Venezuela, sin orden judicial ejecutable contra un ISP
   europeo, es al menos discutible.
2. El objetivo de *"ensure the general operability of those services"* **puede justificar el
   uso de esos datos después del periodo de consulta**.

**⇒ Base legal defendible: art. 6.1(f) + Recital 49 + *Breyer*.** Requiere un **LIA (balancing
test) documentado** y una retención concreta por escrito. Eso es media página, y es el tipo de
documento que un cliente europeo pide y nadie tiene.

#### Otras piezas del GDPR que importan

- **Art. 28(3)** — contenido obligatorio del DPA, ocho letras: (a) tratar solo con
  **instrucciones documentadas**, *"including with regard to transfers of personal data to a
  third country"*; (b) confidencialidad del personal; (c) medidas del art. 32; (d) condiciones
  de los §§ 2 y 4 para subencargados; (e) asistencia en derechos del Capítulo III; (f)
  asistencia en los arts. 32–36; (g) *"at the choice of the controller, deletes or returns all
  the personal data"*; (h) poner a disposición la información y *"allow for and contribute to
  audits, including inspections"*. Más el deber del párrafo final: *"the processor shall
  immediately inform the controller if, in its opinion, an instruction infringes this
  Regulation"*. **Art. 28(2):** no subcontratar sin autorización previa escrita, específica o
  general con derecho de objeción.
- **Art. 33** — el responsable notifica a la autoridad *"without undue delay and, where
  feasible, not later than 72 hours"*; **el art. 33(2) obliga al encargado a notificar al
  responsable *"without undue delay"* SIN plazo fijo**. De ahí la conveniencia de **fijarlo
  contractualmente en 24–48 h**, para que el cliente pueda cumplir sus 72.
- **Art. 30(5)** — exención del registro de actividades para empresas de **menos de 250
  personas**, *"unless… the processing is not occasional"*. **Ojo: por la misma lectura del
  EDPB, el logging continuo "is not occasional"**, así que la exención probablemente no
  aplicaría si el GDPR llegara a aplicar.
- **Art. 37(1)** — DPO obligatorio si la actividad principal requiere *"regular and systematic
  monitoring of data subjects on a large scale"* o tratamiento a gran escala de datos de los
  arts. 9 o 10. **No es el caso de Higerotech** — salvo lo que se dice del art. 10 en §2.4.
- **Estado del texto:** la versión consolidada de EUR-Lex es `02016R0679 — EN — 04.05.2016 —
  000.002`, corregida solo por el **Corrigendum, OJ L 127, 23.5.2018**. **No hay enmienda
  sustantiva al GDPR a 2026-09-16.** El *Digital Omnibus* que extendería la notificación de
  brechas a 96 h y movería las cookies al GDPR **sigue siendo una propuesta: COM(2025) 837
  final, 2025/0360(COD), de 19.11.2025**. **No citar el plazo de 96 h como derecho vigente.**

#### Reino Unido: el art. 22 ya no existe como tal

El **DUAA 2025** (Royal Assent **19 de junio de 2025**, 2025 c. 18) **sustituyó íntegramente el
art. 22 del UK GDPR** por una nueva Sección 4A con **arts. 22A a 22D**. El art. 22A define que
*"a decision is based solely on automated processing if there is no meaningful human
involvement in the taking of the decision"*, y el **art. 22B(1)** prohíbe las decisiones
significativas solo automatizadas basadas total o parcialmente en datos del art. 9(1) salvo
condiciones tasadas, **y prohíbe apoyarlas en la nueva base del art. 6(1)(ea)**
(*"recognised legitimate interest"*, insertada por la s. 70 con un nuevo Annex 1 de cinco
supuestos — seguridad nacional, seguridad pública y defensa, emergencias, delito y protección
de personas vulnerables; **la "seguridad de red" NO está en ese Annex**, así que para logs
sigue aplicando el interés legítimo ordinario con balancing test). **Si Higerotech vende
decisiones automatizadas a un cliente británico, hay que mapear contra 22A–22D, no contra el
viejo art. 22.**

**Cambio institucional inminente:** el S.I. **2026/1015** (hecho el 10-09-2026) pone en vigor
el **30 de septiembre de 2026** la abolición de la oficina del Information Commissioner y la
transferencia de funciones a la **Information Commission**. **A la fecha de este informe el
regulador es el ICO; en dos semanas será la Information Commission.**

### 2.3 Cloudflare como encargado, los logs de borde y las transferencias

#### Hecho verificado en el repositorio — y corrige una premisa de la documentación vigente

`worker/index.mjs` (56 líneas, leído íntegro) **no accede a `request.headers` de entrada, ni a
`request.cf`, ni a la IP**: hace `env.ASSETS.fetch(request)`, copia las cabeceras de
**respuesta** y sustituye `Cross-Origin-Resource-Policy`. `wrangler.jsonc` **no declara bloque
`observability`** ni bindings de logging.

**⇒ En la ruta de producción (Cloudflare Workers), Higerotech no genera ni retiene direcciones
IP.** Los `access_log` de nginx solo existen en la **variante Docker de contingencia**.

Esto **corrige el énfasis de `data-classification.md`**: el vector relevante no son "los logs
de nginx que no salen del host", sino **los logs de borde de Cloudflare**, que son de
Cloudflare y se rigen por sus finalidades y su análisis de ámbito. Es una noticia buena y
accionable: reduce el riesgo bajo la LGPD (§2.1) y da un argumento de altísimo valor
probatorio —**56 líneas de código auditables**— para cualquier due diligence.

`<ACCIÓN PENDIENTE: verificar en el panel de Cloudflare si están activados Logpush, Logpull,
Web Analytics u observability a nivel de cuenta, y dejar constancia escrita del estado. Es el
hecho del que depende toda la defensa anterior.>`

#### Roles

**Cloudflare Data Processing Addendum, Versión 6.4, efectiva el 3 de abril de 2026**,
cláusula 2.3:

> *"the parties acknowledge and agree that the **Customer is the Controller** (or a Processor
> processing Personal Data on behalf of a third-party Controller), and **Cloudflare is a
> Processor** (or sub-Processor, as applicable)…"*

**Higerotech es el responsable; Cloudflare es su encargado.** Encaja con el art. 28(1) GDPR:
usar solo encargados *"providing sufficient guarantees"*.

#### 🔴 Acción de mayor rendimiento de todo el informe: confirmar que el DPA está aceptado

El DPA declara que *"forms part of the Main Agreement"*, **pero su cláusula de efectividad
dice**:

> *"This DPA will be effective… **from the date on which Customer signed or the parties
> otherwise agreed to this DPA ('DPA Effective Date')**."*

**No basta con usar el servicio: hay que aceptarlo o firmarlo afirmativamente.** Higerotech
debe **verificar en el panel de Cloudflare que el DPA está aceptado y guardar el comprobante
con fecha**. Sin eso no hay contrato de encargo y el art. 28(3) no está cubierto
formalmente. Coste: minutos.

#### El punto jurídico que hay que entender bien: Higerotech NO necesita SCCs con Cloudflare

El **art. 44 GDPR** somete el Capítulo V a las transferencias realizadas por un responsable o
encargado **cuyo tratamiento esté sujeto al Reglamento** (*"subject to the other provisions of
this Regulation"*). Y la **Decisión de Ejecución (UE) 2021/914, art. 1(1)**, lo confirma:

> *"The standard contractual clauses… are considered to provide appropriate safeguards…
> for the transfer by a controller or processor of personal data **processed subject to that
> Regulation** (data exporter) to a controller or (sub-)processor **whose processing of the
> data is not subject to that Regulation** (data importer)."*

**⇒ Como el tratamiento de Higerotech no está sujeto al GDPR (§2.2), Higerotech no es
"exportador" del Capítulo V y no necesita SCCs con Cloudflare.** Lo que sí necesita es que el
DPA esté aceptado.

#### Donde SÍ importan las SCCs: cuando Higerotech es el importador

**Este es el escenario real y el que bloquea cierres.** Si un cliente establecido en la UE (o
sujeto al GDPR por el art. 3.2) envía datos personales a Higerotech en Venezuela:

- El **cliente es el exportador** y **Higerotech el importador**.
- **Módulo Dos** si el cliente es responsable; **Módulo Tres** (*"Transfer processor to
  processor"*) si el cliente es encargado y Higerotech subencargado.
- La **cláusula 8.9 del Módulo Dos** obliga al importador a *"make available to the data
  exporter all information necessary to demonstrate compliance… and at the data exporter's
  request, allow for and contribute to audits of the processing activities… at reasonable
  intervals or if there are indications of non-compliance"*, con inspecciones en sus
  instalaciones. **Hay que acotar eso en el MSA** (cláusula C7).
- **Venezuela no tiene decisión de adecuación**, así que el cliente necesitará SCCs + un
  **Transfer Impact Assessment**. **Higerotech debe tener las SCCs pre-firmadas (Módulos Dos y
  Tres) y una nota de contexto legal venezolano para el TIA del cliente.** Eso es lo que el
  cliente pedirá y lo que suele retrasar las firmas.
- Sanción por incumplir el Capítulo V: **art. 83(5)(c), 20.000.000 EUR o 4 %** — el tramo
  alto. Es el riesgo del cliente, pero se transmite a Higerotech por indemnidad.

#### Lo demás verificado del DPA de Cloudflare

- **EU SCCs** = las de la **Decisión de Ejecución 2021/914 de 4 de junio de 2021**, con
  *"Module Two will apply where Customer… is a Controller and Module Three will apply where
  Customer… is a Processor"*, cláusula 7 *docking* activada, cláusula 9 **Opción 2**,
  cláusula 17 Opción 2.
- **UK Addendum** = el *International Data Transfer Addendum* **Versión B1.0** del ICO.
- **Data Privacy Framework**: *"a transfer of Personal Data to the United States pursuant to
  the Data Privacy Framework shall not be a Restricted Transfer"*. La adecuación de EE.UU. es
  la **Decisión de Ejecución (UE) 2023/1795 de 10 de julio de 2023** (OJ L 231, 20.9.2023,
  p. 118), **vigente**; el Tribunal General desestimó el recurso de anulación en **T-553/23
  *Latombe*, sentencia de 3 de septiembre de 2025**, y hay **casación pendiente ante el TJUE,
  C-703/25 P** `[secundaria]`. Si el TJUE la anulara (escenario *Schrems III*), las
  transferencias volverían a las SCCs del Anexo 2 del propio DPA — **razón adicional para
  asegurarse de que el DPA esté firmado**.
- **Brechas:** *"without undue delay notify the Customer upon becoming aware of any breach of
  security…"*. **Sin plazo en horas.** Y *"not make any public announcement about a Personal
  Data Breach… without the prior written consent of the Customer, unless required by applicable
  law"*.
- **Auditoría y supresión:** *"enable Customer to request one onsite audit per annual period
  during the Term"*; *"at the choice of Customer, delete or return all Personal Data"*.
- **Subencargados:** lista pública en `cloudflare.com/gdpr/subprocessors/`, con aviso de nuevos
  con al menos **30 días** de antelación.
- **Retención de logs HTTP:** por defecto **no se retienen**; hay que habilitarla
  explícitamente (Logpull/Logpush).
- **Localización, si un cliente la exige:** Cloudflare ofrece la **Data Localization Suite** —
  *Regional Services* (la terminación TLS, y por tanto la ejecución del Worker, ocurre solo
  dentro de la región configurada), *Customer Metadata Boundary* (los logs y la analítica no
  salen de la región) y *Geo Key Manager*. No es necesaria hoy; **es la respuesta técnica
  preparada para el cliente europeo o chileno que pregunte**.

### 2.4 El riesgo de vender "automatización con IA" y modelos de perfilado AML/CFT

Cinco capas que se apilan sobre un mismo producto, en orden de severidad.

#### 🔴 Capa 1 — AI Act art. 5(1)(d): es una PROHIBICIÓN, vale 35 M EUR o 7 %, y está vigente desde el 2 de febrero de 2025

Es el riesgo más severo de todo el informe y el menos obvio, porque **no es "alto riesgo con
obligaciones": es una práctica prohibida**.

> **Art. 5(1)(d):** *"the placing on the market, the putting into service for this specific
> purpose, or the use of an AI system for making **risk assessments of natural persons in
> order to assess or predict the risk of a natural person committing a criminal offence, based
> solely on the profiling of a natural person or on assessing their personality traits and
> characteristics**; this prohibition shall not apply to AI systems used to support the human
> assessment of the involvement of a person in a criminal activity, **which is already based
> on objective and verifiable facts directly linked to a criminal activity**;"*

El blanqueo de capitales y la financiación del terrorismo **son delitos**. Un modelo que
puntúe a **personas físicas** por su propensión a lavar dinero, basado solo en perfilado o en
rasgos, cae aquí. Sanción del art. 99.3 — la más alta del Reglamento, atenuada para pymes por
el art. 99.6 al **menor** de los dos importes.

**La salida está en el texto y es una regla de arquitectura, no una cláusula.** Recital 42:

> *"that prohibition **does not refer to or touch upon risk analytics that are not based on the
> profiling of individuals** or on the personality traits and characteristics of individuals,
> **such as AI systems using risk analytics to assess the likelihood of financial fraud by
> undertakings on the basis of suspicious transactions**…"*

**⇒ Regla de diseño, tres partes:** (1) el sujeto de la puntuación es la **transacción** o la
**persona jurídica**, nunca la persona física; (2) las *features* son **hechos objetivos y
verificables de la transacción**, nunca rasgos, nacionalidad, lugar de nacimiento o nivel de
deuda (el Recital 42 los nombra); (3) **human-in-the-loop con autoridad real de decisión**,
documentada.

#### Capa 2 — AI Act Anexo III.5(b): alto riesgo del perfilado crediticio, diferido al 2 de diciembre de 2027

> **Anexo III, punto 5(b):** *"AI systems intended to be used **to evaluate the creditworthiness
> of natural persons or establish their credit score, with the exception of AI systems used for
> the purpose of detecting financial fraud**;"*

**⇒ Scoring de solvencia de personas físicas = alto riesgo. Detección de fraude financiero =
exceptuada por el propio texto del Anexo.** El Anexo III **no fue modificado** por el
Reglamento 2026/1744. Pero con dos advertencias verificadas:

- **Tensión Anexo/Recital que hay que flagear.** El **Recital 58** formula la excepción más
  estrechamente: *"However, **AI systems provided for by Union law** for the purpose of
  detecting fraud in the offering of financial services… should not be considered to be
  high-risk"*. Un sistema AML/CFT venezolano **no** está *"provided for by Union law"*. El
  texto del Anexo es la norma operativa y el recital es interpretativo, así que **la excepción
  es defendible por el Anexo pero atacable por el Recital 58**. `<SIN VERIFICAR: no se localizó
  guía de la Comisión que resuelva la tensión.>`
- **El filtro del art. 6(3) no está disponible si hay perfilado.** El art. 6(3) permite
  excluir del alto riesgo los sistemas del Anexo III que solo realizan tareas procedimentales
  estrechas o preparatorias, **pero su último párrafo cierra la puerta**: *"Notwithstanding the
  first subparagraph, an AI system referred to in Annex III shall **always** be considered to be
  high-risk where the AI system **performs profiling of natural persons**."* Y el art. 6(4)
  exige que el provider que se acoja al 6(3) *"document its assessment before that system is
  placed on the market"*, quedando sujeto al registro del art. 49(2).

#### Capa 3 — GDPR art. 22 + art. 10: la combinación más restrictiva

- **Art. 22(1):** derecho a no ser objeto de una decisión *"based solely on automated
  processing, including profiling, which produces legal effects… or similarly significantly
  affects"*. Bloquear una cuenta, rechazar una transacción o emitir un reporte de operación
  sospechosa encajan de lleno. Las salvaguardias del 22(3) son **intervención humana, expresar
  su punto de vista e impugnar la decisión**; el 22(4) prohíbe basarlas en datos del art. 9(1)
  salvo 9(2)(a) o (g).
- **⚠️ Art. 10 — la barrera dura que nadie ve venir:** *"Processing of personal data relating to
  criminal convictions and offences or related security measures based on Article 6(1) shall be
  carried out **only under the control of official authority** or when the processing is
  **authorised by Union or Member State law** providing for appropriate safeguards."* **Las
  alertas AML/CFT son datos relativos a presuntas infracciones.** Si alguna vez tocaran
  titulares en la UE, esto no es un requisito documental: exige **habilitación legal**.
- **Efecto colateral en cadena:** tratamiento del art. 10 a gran escala destruye la excepción
  del art. 27(2)(a) y, con el art. 37(1)(c), puede activar la obligación de **DPO**.
- **Reino Unido:** el estándar son los **arts. 22A–22D** del DUAA, no el art. 22 (§2.2).

#### Capa 4 — Colombia y Argentina: dos puertas que se abren a favor

- **Colombia, art. 2(b) de la Ley 1581:** el régimen **no se aplica** a las bases de datos cuya
  finalidad sea *"la prevención, detección, monitoreo y control del lavado de activos y el
  financiamiento del terrorismo"*. **Argumento comercial fuerte, verificado en fuente
  primaria** (con el matiz del parágrafo: los principios siguen aplicando).
- **Argentina, art. 12.2(c):** la prohibición de transferencia internacional no rige para
  *"transferencias bancarias o bursátiles, en lo relativo a las transacciones respectivas"*, ni
  para la cooperación internacional en crimen organizado, terrorismo y narcotráfico (literal
  e). Utilizable, aunque limitado a las transacciones respectivas.

#### Capa 5 — Obligaciones de documentación y transparencia (no de sustancia)

- **CCPA ADMT:** *"significant decision"* incluye expresamente *"the provision or denial of
  financial or lending services"*. Higerotech no es *business*, pero sus clientes sí, **y los
  businesses siguen siendo responsables aunque usen herramientas de terceros** ⇒ trasladarán la
  exigencia por contrato. Obligación del cliente desde el **1 de enero de 2027**.
- **AI Act art. 50 (vigente):** el 50(1) obliga a informar que se interactúa con una IA
  *"unless this is obvious"*; el **50(2)** obliga a que las salidas de sistemas que generan
  *"synthetic audio, image, video or text content"* estén *"marked in a machine-readable format
  and detectable as artificially generated or manipulated"*; el 50(5) exige darlo *"at the
  latest at the time of the first interaction or exposure"*. Plazo de gracia al **2 de
  diciembre de 2026** para sistemas generativos ya en el mercado antes del 2-08-2026.
- **AI Act art. 4 (vigente, y ablandado por el Reg. 2026/1744):** ahora *"shall take measures to
  support the development of AI literacy"* y expresamente *"does not require providers or
  deployers to guarantee any specific level of AI literacy of any individual"*. Pasó de
  obligación de resultado a obligación de esfuerzo. **Basta un plan de formación documentado
  con registros. Barato: hazlo.**
- **GPAI, si Higerotech afina y redistribuye modelos:** el art. 51(2) presume riesgo sistémico
  por encima de **10^25 FLOPs** de cómputo de entrenamiento (fuera del alcance de Higerotech),
  pero el **art. 53(1)(c) y (d)** —política de cumplimiento del derecho de autor y **resumen
  público suficientemente detallado del contenido de entrenamiento**— son plausibles si se
  redistribuye un modelo afinado bajo marca propia.

#### Calendario consolidado del AI Act a 2026-09-16

**Hallazgo crítico verificado:** el calendario **cambió en julio de 2026**. El **Reglamento
(UE) 2026/1744 del Parlamento Europeo y del Consejo, de 8 de julio de 2026** (*"Digital Omnibus
on AI"*, OJ L series 2026/1744 de 24.7.2026), en vigor el **27 de julio de 2026**, modificó el
art. 113 y diferió el alto riesgo.

| Bloque | Fecha de aplicación | Estado a 2026-09-16 |
|---|---|---|
| Capítulos I y II (**prohibiciones del art. 5**) y art. 4 (alfabetización) | 2 de febrero de 2025 | **VIGENTE** |
| Cap. III Secc. 4, **Cap. V (GPAI)**, Cap. VII, **Cap. XII (arts. 99–100, sanciones)**, art. 78 | 2 de agosto de 2025 | **VIGENTE** |
| Arts. 102 a 110 | 27 de julio de 2026 | **VIGENTE** |
| Resto del Reglamento, incluido el **art. 50 (transparencia)** | 2 de agosto de 2026 | **VIGENTE** |
| Nuevas prohibiciones del art. 5(1)(ba), (bb) y 5(1a), (1b) — material íntimo no consentido y CSAM | 2 de diciembre de 2026 | Pendiente |
| Cumplimiento del art. 50(2) para sistemas generativos ya en el mercado antes del 2-08-2026 | 2 de diciembre de 2026 | Pendiente |
| **Alto riesgo del Anexo III** (Cap. III Secc. 1-3) | **2 de diciembre de 2027** | **DIFERIDO** |
| **Alto riesgo del Anexo I** | **2 de agosto de 2028** | **DIFERIDO** |

**Lo que NO se aplazó:** las prohibiciones del art. 5, las obligaciones GPAI, la transparencia
del art. 50, la alfabetización del art. 4 y las sanciones del art. 99. **Todo eso muerde hoy.**

### 2.5 PCI DSS: qué obliga a un desarrollador que no almacena datos de tarjeta

**La obligación de Higerotech no nace del estándar, nace del contrato.** El propio texto:
*"Whether any entity is required to comply with or validate their compliance to PCI DSS is at
the discretion of those organizations that manage compliance programs (such as payment brands
and acquirers)."*

**Requisito 6 — desarrollo seguro (lo que aplica aunque nunca se vea un PAN):**

- **6.2.1** desarrollo seguro basado en estándares de la industria, conforme a PCI DSS e
  incorporando seguridad en cada etapa del ciclo de vida. Aplica al software desarrollado **para
  o por** la entidad; no al software de terceros.
- **6.2.2** *"Software development personnel working on bespoke and custom software are trained
  **at least once every 12 months**"*. La *testing procedure* dice *"Examine training records"*
  ⇒ **hay que conservar registros de formación**.
- **6.2.3** *code review* previo a cada release a producción o a clientes.
- **6.3.1** gestión de vulnerabilidades desde *"industry-recognized sources… including alerts
  from… computer emergency response teams (CERTs)"* con *risk ranking* propio. **Nota de
  aplicabilidad clave: *"This requirement is not achieved by, and is in addition to, performing
  vulnerability scans according to Requirements 11.3.1 and 11.3.2."***
- **6.3.2** inventario tipo **SBOM** del software propio y de los componentes de terceros
  incorporados.
- **6.4.3** scripts de la página de pago: método para confirmar que cada script está
  **autorizado**, método para asegurar su **integridad**, e **inventario con justificación
  escrita** de por qué cada uno es necesario. **El reparto de responsabilidad está en la propia
  nota:** aplica a los scripts de la página de la entidad que incrusta el formulario del
  procesador (iframes), **pero *"Scripts in the TPSP's/payment processor's embedded payment
  page/form are the responsibility of the TPSP/payment processor to manage"***. Mecanismos que
  el estándar cita: **SRI**, **CSP** (incluido restringir con `frame-src` el origen del que
  puede cargarse la página de pago) y sistemas de gestión de scripts.
- **11.6.1** — par inseparable del 6.4.3: mecanismo de detección de cambios y manipulación sobre
  *"the security-impacting HTTP headers and the script contents of payment pages **as received
  by the consumer browser**"*, **al menos semanalmente** o según el *targeted risk analysis* del
  12.3.1, **alertando a personas**.

**Requisito 12.9 — lo que obliga a Higerotech como proveedor de servicios:**

- **12.9.1** *"TPSPs provide **written agreements** to customers that include acknowledgments
  that TPSPs are responsible for the security of account data the TPSP possesses or otherwise
  stores, processes, or transmits on behalf of the customer, **or to the extent that the TPSP
  could impact the security** of the customer's cardholder data…"*. La *testing procedure*
  examina *"TPSP policies, procedures, and **templates** used for written agreements"* ⇒ **hay
  que tener plantilla y procedimiento, no una cláusula suelta**.
- **12.9.2** atender, **a solicitud del cliente**, (i) el estado de cumplimiento PCI DSS y (ii)
  qué requisitos son del TPSP, cuáles del cliente y cuáles compartidos.

**Requisito 12.8 — lo que el cliente hará sobre Higerotech:** inventario de TPSP (12.8.1),
acuerdos escritos con reconocimiento (12.8.2), *due diligence* previa (12.8.3), **monitoreo del
estado de cumplimiento al menos cada 12 meses (12.8.4)** con una nota con dientes —*"**If the
TPSP does not meet those applicable PCI DSS requirements, then those requirements are also 'not
in place' for the entity**"*— y **responsibility matrix (12.8.5)**. Sobre TPSP anidados: *"it is
the responsibility of the primary TPSP to manage and monitor any secondary TPSPs."*

**Tres documentos distintos y NO intercambiables — y la buena noticia para quien no tiene AOC:**

1. **Acuerdo escrito con reconocimiento** (12.8.2 / 12.9.1). El estándar advierte
   expresamente: *"Evidence that a TPSP is meeting PCI DSS requirements is **not** the same as a
   written acknowledgment. For example, a PCI DSS Attestation of Compliance (AOC), a declaration
   on a company's website, a policy statement, a responsibility matrix, or other evidence not
   included in a written agreement is **NOT** a written acknowledgment."*
2. **Attestation of Compliance (AOC)** (12.8.4 / 12.9.2). **Y la salida para el caso probable de
   Higerotech, literal del estándar:** *"If the TPSP did not undergo a PCI DSS assessment, it may
   be able to provide **other sufficient evidence** to demonstrate that it has met the applicable
   requirements without undergoing a formal compliance validation… Alternatively, the TPSP can
   elect to undergo multiple **on-demand assessments** by each of its customers' assessors."*
   **⇒ Hay dos rutas legítimas sin certificarse.**
3. **Responsibility matrix** (12.8.5 / 12.9.2), requisito por requisito.

**SAQ A vs SAQ A-EP: la decisión de arquitectura que Higerotech toma al escribir el código.**
**SAQ A** exige que *"All elements of the payment page(s)/form(s) delivered to the customer's
browser originate **only and directly** from a PCI DSS compliant TPSP/payment processor"*.
**SAQ A-EP** cubre al comercio cuyo sitio *"does not receive account data but **controls how
customers, or their account data, are redirected**"*, y su criterio es que cada elemento de la
página de pago provenga **del sitio del comercio o** de un TPSP compliant. En la práctica:
redirección íntegra o iframe del procesador ⇒ **SAQ A**; widgets JavaScript, Direct Post u otras
técnicas donde el sitio dirige el flujo ⇒ **SAQ A-EP**, con aproximadamente diez veces más
requisitos. `<La formulación práctica del criterio viene de fuentes secundarias concordantes;
los bullets de elegibilidad citados son primarios de la v4.0 de abril de 2022 — los PDFs de
v4.0.1 devolvieron 403.>`

**Y el mito que hay que desmontar**, literal del propio SAQ A: *"PCI DSS Requirements that
address the protection of computer systems (for example, **Requirements 2, 6, and 8**) apply to
e-commerce merchants that redirect customers from their website to a third party for payment
processing, and specifically to the **merchant web server upon which the redirection mechanism
is located**."* **Redirigir no elimina el alcance: lo reduce.**

**Cambio de v4.0.1 en SAQ A** (comunicado del PCI SSC del 30 de enero de 2025, en efecto el
31 de marzo de 2025): se eliminaron del cuerpo del SAQ A los requisitos **6.4.3, 11.6.1 y
12.3.1**, y a cambio se añadió un **nuevo criterio de elegibilidad**: *"The merchant has
confirmed that their site is not susceptible to attacks from scripts that could affect the
merchant's e-commerce system(s)."* La **FAQ 1588** (febrero 2025) da dos vías para satisfacerlo:
(a) usar técnicas como las de 6.4.3 y 11.6.1, o (b) obtener **confirmación escrita del TPSP
compliant** de que su solución embebida, desplegada según sus especificaciones, incluye
protecciones contra ataques de scripts. El Council advierte que los cambios *"do not remove or
diminish the underlying requirements within PCI DSS"*: **es un cambio de cómo se reporta, no de
qué hay que proteger.**

---

## 3. Benchmark de consultoras comparables

Doce empresas con al menos una página legal abierta y leída el 2026-09-16. Se mezclaron
grandes y medianas LatAm/globales con tres boutiques AI-first del tamaño real de Higerotech.

### 3.1 Tabla comparativa

| Empresa | URL legal verificada | Jurisdicción declarada | Documentos que publica | Cláusula distintiva |
|---|---|---|---|---|
| **Thoughtworks** (global, Chicago) | `thoughtworks.com/about-us/privacy-policy` | Thoughtworks, Inc. (Illinois) como responsable; "la entidad de tu región actuará generalmente como responsable". Sin ley aplicable explícita | Privacidad **modular en 4 subpáginas**, Cookie Policy separada, paquete ESG (modern slavery, código de conducta, antisoborno, canal de denuncias, compra sostenible, accesibilidad) | Cookie Preference Center con **listado nominal de 20+ terceros** (Adobe, Google, LinkedIn, Meta, Microsoft) y enlace a la política de cada uno |
| **Globant** (LatAm/NYSE) | `university.globant.com/privacy-policy` | **Globant S.A., Luxemburgo**. Sin ley aplicable ni foro declarados | Privacidad, Cookie Policy, Terms of Services | La política verificada **no menciona transferencias internacionales** ("almacenada en servidores seguros") — hueco llamativo para un grupo multipaís. `<SIN VERIFICAR: privacidad y T&C del sitio principal y T&C de producto Enterprise AI devuelven HTTP 403 a fetch automatizado>` |
| **BairesDev** (Argentina/California) | `bairesdev.com/terms-conditions/`, `/privacy-policy/` | **BairesDev LLC**, California. Sin ley aplicable ni foro en los T&C | Privacidad, T&C del sitio, "Do Not Sell My Personal Information", privacidad de candidatos, T&C de referidos | **Apéndices por jurisdicción**: GDPR, CCPA/CPRA, Virginia, Colorado, Connecticut, Utah, Texas, Oregón, Florida, Montana, Delaware y **Ley argentina 25.326**. Enfoque "una sección por régimen" |
| **Endava** (UK/LatAm, NYSE) | `endava.com/privacy-notice`, `/terms-and-conditions`, `/legal` | **Endava plc**, Inglaterra, reg. 05722669. Marco UK GDPR/UE + disposiciones para Colombia | Privacy Notice, T&C, Cookie Policy, **Supplier DPA público (PDF)**, Supplier Code of Conduct, Supplier General T&C, Modern Slavery. Declara **ISO 27001 y SOC 2** | De los pocos que publica **el DPA que impone a sus proveedores**. Retenciones cuantificadas: candidatos 24 meses, visitas a oficina 30 días |
| **Softtek** (México) | `es.softtek.co/politica-de-privacidad` | **Valores Corporativos Softtek S.A. de C.V.**, Monterrey. **Doble marco**: LFPDPPP + Reglamento (UE) 2016/679 | Aviso de privacidad, Terms of Use, Cookie Policy | Único con **derechos ARCO** explícitos; exige a terceros fuera de la UE adoptar **"Cláusulas Modelo de la UE"** y acuerdos de confidencialidad |
| **Coforge** (ex-Encora; India) | `coforge.com/privacy-statement` | **Coforge Limited**, Gurugram. Ley aplicable vía **"Geography-Specific Addendums"** (Norteamérica, LATAM, Europa, APAC, Medio Oriente) | Privacidad con addenda regionales, Cookie Policy, Recruitment Privacy Notice, Visitor Privacy Notice, formulario DSR, formulario de queja, código de conducta, Terms of Use | **Distinción controlador/encargado explícita**: controlador en su web y eventos, encargado cuando trata "Customer Data" *"solely on their behalf"* bajo **MSA + DPA**. Certificado **EU-U.S. DPF + UK Extension + Swiss-U.S. DPF**. **DPOs regionales**: `dpo@`, `dpo.ph@`, `dpo.br@`. Nota: `encora.com/privacy-policy` **redirige 301 a coforge.com** (adquisición) |
| **Luxoft / DXC** (Zug, Suiza) | `luxoft.com/terms-of-use`, `/online-privacy-policy-2022` | **Luxoft Holding, Inc.**, Zug; web en AWS Irlanda. ToS: **ley de Nueva York + arbitraje AAA** | Terms of Use, Privacy Notice, California Privacy Notice Supplement, Group Data Protection Policy, Acceptable Use Policy, DXC Information Security Policy, Data Privacy Supplement para proveedores | Transferencias por **SCCs + Binding Corporate Rules** intragrupo. Brechas: *"we will contact you without undue delay"* **solo si** puede causar daño material o inmaterial |
| **10Pines** (Argentina, ~100 personas) | `academia.10pines.com/politicadeprivacidad` | **10Pines SRL**, Buenos Aires. **Sin ley aplicable ni foro** | **Un solo documento** para 4 dominios, con cookies dentro. Sin T&C | Minimalismo extremo: ni retención, ni transferencias, ni roles. Seguridad = "todos los estándares de la industria". Sostenible, pero **inservible ante un due diligence empresarial** |
| **8th Light** (EE.UU., boutique ~100) | `8thlight.com/terms-of-use`, `/privacy-policy` | **Eighth Light LLC**. ToU: **ley de Illinois**, foro exclusivo en Chicago, Cook County | ToU, Privacidad con DPO nombrado, Privacy Notice for California Residents, Global Candidate Privacy Notice, código de conducta, accesibilidad, plan de carbono | **La mejor cláusula del benchmark para un consultor**: *"Your use of the Site does not create a consultant-client, employee-employer, or other professional relationship"* — la relación profesional nace **solo** con un MSA escrito firmado. Además libera los snippets del blog bajo **licencia MIT** |
| **Tribe AI** (AI-first, NY, pequeña) | `tribe.ai/terms-of-service`, `/privacy-policy` | Operada por **Mercury, Inc. dba Tribe AI**. *"The laws of the State of New York… shall exclusively govern"*; foro exclusivo New York County. Sin arbitraje | ToS + privacidad. **Sin DPA, sin subencargados, sin política de IA** | **Tope monetario duro y bajísimo**: *"WILL NOT BE LIABLE… FOR ANY AMOUNT THAT EXCEEDS (A) [fees paid] OR (B) US $1000"*. Sin indemnidad, sin confidencialidad y —**siendo AI-first**— **sin cláusula de no-entrenamiento** |
| **Aimpoint Digital** (boutique IA/datos, EE.UU.) | `aimpointdigital.com/terms-conditions`, `/privacy-policy` | **Aimpoint Digital LP**, Florida. T&C: **ley de Florida** pero litigio *"in state and federal courts located in Fulton, Georgia"* | T&C, Privacidad con sección CCPA, EULA | **Caso de estudio de plantilla mal cerrada**: ley de un estado y foro de otro. Retención dura: *"no purpose… will require us keeping your personal information for longer than 2 years"*. **Ningún disclaimer específico de IA** |
| **Human Layer Lab** (AI-first, Singapur, micro) | `humanlayerlab.com/dpa`, `/privacy`, `/terms` | **Human Layer Lab Pte. Ltd.** (UEN 202616831M), Singapur. **Ley de Singapur + arbitraje SIAC**; privacidad bajo PDPA + Privacy Act 1988 (AU) + Privacy Act 2020 (NZ), con cláusulas GDPR donde aplique | **El stack más completo del set siendo el más pequeño**: privacidad, terms, **DPA propio con lista nominal de subencargados**, trust center y portal de solicitudes | **No-entrenamiento literal**: *"We do not use customer data to train, fine-tune, or otherwise develop AI models. This applies to customer data in any form, including anonymised or aggregated derivatives"*. Tope = **12 meses de honorarios**. IA como "decision support", salidas *"advisory, non-binding"*, prohibido usarlas *"without human review"*. Brecha: **72 h**. Borrado: **30 días** |
| **Artefact** (consultora IA, Francia) *(bonus)* | `artefact.com/privacy-policy/` | **Artefact S.A.**, París, RCS 418 267 704. **GDPR + Ley francesa 78-17** | Privacidad, Cookie Policy, Data Privacy, General Terms, plan de carbono, índice de igualdad | **DPO externalizado a un despacho** ("Ydès Avocats, París"). SCCs nombradas. Retenciones cuantificadas una por una: newsletter 3 años, candidaturas 2 años, contenidos 5 años |
| **Trust3 AI / Privacera** *(bonus: referencia de redacción de DPA)* | `trust3.ai/dpa/` | Privacera, Inc. (Newark, CA); en las SCC elige **ley irlandesa** y la **DPC irlandesa** como autoridad | DPA público con SCCs Módulo Dos, UK IDTA v.B1.0 y FADP suiza | Subencargados con **preaviso de 14 días y ventana de objeción de 7 días**; prohibición de tratar datos *"for any purpose not related to providing the Services"* y de "vender" según CCPA |

### 3.2 Patrón común (N = 12)

| Documento | Frecuencia | Lectura |
|---|---|---|
| Política / aviso de privacidad | **12 / 12** | El único documento universal. Piso obligatorio |
| Términos de uso **del sitio web** (≠ contrato de servicios) | **7 / 12** verificados + 3 enlazados sin abrir | Casi universal. Thoughtworks es la excepción |
| Cookies como documento separado | 6 / 12 | Lo separan los grandes con tráfico europeo; las boutiques lo meten dentro de privacidad |
| Aviso regional CCPA/California | 5 / 12 | Se dispara por **vender a EE.UU.**, no por tamaño |
| Aviso de privacidad de candidatos/RRHH aparte | 4 / 12 | Patrón claro: el reclutamiento se saca del documento comercial |
| Mención expresa de SCCs o equivalente | 7 / 12 | Globant (verificado), 10Pines, Tribe AI y Aimpoint **no tratan** transferencias internacionales |
| DPA con texto público | 2–3 / 12 | En consultoría, lo normal es que el DPA viva **dentro del MSA**, no en la web |
| Lista nominal de subencargados | **1 / 12** (Human Layer Lab) | Prácticamente inexistente en consultoras; es un patrón SaaS |
| Aviso legal / impressum europeo | 1 / 12 (Artefact) | No es la norma anglosajona |
| **SLA público** | **0 / 12** | **Nadie** publica SLA en la web. Vive en el contrato |
| **Política de IA responsable como documento legal** | **0 / 12** | Nadie. HLL, el único AI-first con cláusulas de IA, las **incrusta** en ToS + DPA + privacidad |
| `/.well-known/security.txt` | **0 / 6 comprobados** | La divulgación responsable **no es práctica de esta industria**. Publicarla te pone por encima del estándar por casi cero esfuerzo |
| Certificaciones (ISO 27001, SOC 2, DPF) en la página legal | 3 / 12 | La mayoría no las menciona en documentos legales; van en el trust center o en el proceso comercial |

**Cláusulas que se repiten, con su redacción típica:**

1. **"AS IS / AS AVAILABLE"** — en 6 de 7 términos de uso verificados, en mayúsculas:
   *"THE SITE AND ITS CONTENT ARE PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS, WITHOUT
   ANY WARRANTIES OF ANY KIND"* (8th Light; casi idéntico en Luxoft y Aimpoint). Es la
   cláusula más estandarizada del set.
2. **Exclusión de daños indirectos** — universal: indirectos, consecuenciales, especiales,
   incidentales, ejemplares y punitivos.
3. **Tope de responsabilidad** — tres variantes: (a) sin tope, solo disclaimer (8th Light,
   BairesDev, Endava en el sitio); (b) *tope = lo pagado*, que en un sitio gratuito equivale a
   cero (Luxoft, Aimpoint: *"the amount paid, if any, by you to us"*); (c) **tope duro** cuando
   el documento cubre servicios reales: Tribe AI *"…EXCEEDS (A) [fees] OR (B) US $1000"*, HLL
   *"NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE
   CLAIM"*. **El "tope = honorarios de N meses" existe y el valor de referencia publicado es
   12 meses.** No se vieron topes de 3 o 6 meses en documentos públicos (los MSA con esos
   topes no se publican).
4. **Indemnidad unilateral del usuario** — solo 2 de 7 ToS. Opcional en un sitio web,
   obligatoria en un MSA.
5. **PI: entregable vs. herramientas preexistentes** — el reparto canónico lo formula HLL: **el
   proveedor retiene** *"platform software, methodologies, schemas, frameworks, taxonomies,
   interfaces"*; **el cliente retiene** *"their input data, configurations, generated
   reports/exports"*, con licencia limitada, no exclusiva e intransferible de uso interno.
6. **Roles controlador/encargado** — la redacción de referencia es la de Coforge (controlador
   en su web y eventos; encargado sobre "Customer Data" *"solely on their behalf"* bajo MSA +
   DPA). Tribe AI, Aimpoint y 10Pines **no distinguen roles**.
7. **Subencargados** — dos patrones: autorización general con derecho de objeción (Trust3: 14
   días de preaviso / 7 de objeción) frente a consentimiento escrito previo. DXC exige a sus
   proveedores contratos con subencargados *"no less protective"* que el principal.
8. **Notificación de brechas** — la industria se divide: *"without undue delay"* sin plazo en
   las políticas de privacidad, y **72 horas** en los DPA (HLL: *"72 hours after becoming aware
   of it"*). Seis de doce **no mencionan brechas** en su política de privacidad.
9. **Retención** — la fórmula estándar es *"only for as long as reasonably necessary to fulfil
   the purposes"*. Solo 4 cuantifican.
10. **Ley aplicable y foro** — cuando se declara: **ley del estado/país de la sede + foro
    exclusivo en su ciudad** (Illinois/Chicago; Nueva York/New York County; Nueva York +
    arbitraje AAA; Singapur + arbitraje SIAC). Los grandes multinacionales tienden a **no
    declarar ley aplicable** en el sitio web y a resolverlo por addenda regionales.
11. **No-garantía de resultados de IA** — **1 de 12** lo redacta (HLL).
12. **Prohibición de entrenar modelos con datos del cliente** — **1 de 12** (HLL, extendido a
    derivados anonimizados o agregados). Trust3 lo consigue indirectamente por limitación de
    finalidad. **Tribe AI, siendo consultora de IA, no lo tiene.**
13. **Confidencialidad** — ausente en todos los ToS de sitio web verificados. Vive
    exclusivamente en el MSA.

### 3.3 Qué recortan las boutiques — y qué precio pagan

**Solo los grandes tienen** (y una boutique puede omitirlo sin quedar fuera de mercado):
paquete ESG completo; addenda por geografía y DPOs regionales; documentos del lado proveedor
(Supplier DPA, Supplier Code of Conduct); apéndices estado-por-estado de EE.UU.; Binding
Corporate Rules intragrupo; certificaciones DPF/ISO 27001/SOC 2 declaradas.

**Las tres estrategias de boutique observadas:**

- **10Pines — minimalismo total.** Un documento para cuatro dominios. Barato de mantener,
  **inservible ante un due diligence de cliente empresarial**. Es lo que Higerotech **no**
  debe copiar si quiere vender a bancos.
- **Tribe AI — limitar la exposición con una cifra absoluta.** Sin abogados, sin DPA, sin
  confidencialidad; a cambio, tope de **USD 1.000**. Funciona como escudo pero deja el hueco
  comercial del no-entrenamiento abierto.
- **Human Layer Lab — el modelo a imitar.** Una microempresa de Singapur publica **más y
  mejor** que los grandes: privacidad + terms + DPA propio con subencargados nominales + trust
  center, con topes explícitos (12 meses), plazos explícitos (72 h de brecha, 30 días de
  borrado), reparto de PI explícito y arbitraje SIAC. Coste de mantenimiento: la lista de
  subencargados.
- **8th Light — la mejor relación coste/beneficio del benchmark.** No publica DPA, ni
  subencargados, ni ISO; pero mueve **todo** el riesgo contractual al MSA con una sola frase
  en el ToS: sin MSA firmado no hay relación profesional.
- **Aimpoint Digital — la advertencia.** Plantilla generada sin revisar: ley de Florida con
  foro en Georgia, retención capada a 2 años en una consultora de datos. El coste del atajo
  es la coherencia, y una contraparte con abogados lo usa.

---

## 4. Distinción crítica de roles

Higerotech mezcla hoy tres negocios que exigen **documentos distintos**. Confundirlos es la
principal fuente de riesgo evitable.

| | (a) Responsable / controlador | (b) Encargado / procesador | (c) Proveedor de software (entrega, no opera) |
|---|---|---|---|
| **Qué datos** | IPs y user-agent de visitantes del sitio; correo, nombre, empresa y contenido de mensajes de prospectos que escriben a `contacto@` o por WhatsApp | Datos de los clientes finales del cliente, tratados en las aplicaciones que Higerotech desarrolla **y opera** (SaaS, soporte con acceso a producción, mantenimiento sobre datos reales) | Ninguno tras la entrega — el cliente despliega y opera; Higerotech no accede |
| **Quién decide la finalidad** | Higerotech | **El cliente** (Higerotech solo ejecuta instrucciones documentadas) | El cliente, íntegramente |
| **Documento vehículo** | **Política de Privacidad del sitio** + Aviso de tratamiento para prospectos | **DPA / Acuerdo de Tratamiento de Datos**, anexo al MSA. **No** la política de privacidad del sitio | **MSA / Términos de Servicio** + acta de entrega + cláusula de traslado de responsabilidad |
| **Estado hoy** | **No existe** el documento. Y la clasificación de datos vigente afirma que no hay tratamiento (ver §5.4) | **No existe.** Es el hueco más grave: si un banco pide firmar un DPA, Higerotech firmará el del banco | **No existe.** Sin acta de entrega ni cláusula de corte, la responsabilidad operativa se presume compartida indefinidamente |
| **Riesgo si falta** | Reclamación de habeas data sin procedimiento; incoherencia entre lo publicado y lo real; si hay visitantes UE, art. 13/14 GDPR incumplido | Responsabilidad ilimitada por el DPA que imponga el cliente; exposición penal de los arts. 20 y 22 LECDI por acceso a datos productivos sin marco escrito | Que un incidente de seguridad tres años después del cierre se imputa a Higerotech porque nunca se documentó dónde acaba su responsabilidad |

**Notas por escenario:**

**(a) Responsable.** El tratamiento es mínimo pero **no es cero**: Cloudflare ve la IP de
cada visitante en el borde (ver §5.4) y los prospectos envían datos personales por correo y
WhatsApp. La política de privacidad debe declarar exactamente eso, con base de legítimo
interés para logs de seguridad y ejecución precontractual para los mensajes de prospectos.
**Es un documento corto, y su valor está en ser verdad.**

**(b) Encargado.** Aquí es donde el dinero y el riesgo coinciden. Las cláusulas que el DPA de
Higerotech debe contener (y que un DPA impuesto por un banco no contendrá a su favor):
tratamiento solo bajo instrucciones documentadas; **prohibición absoluta de usar datos del
cliente para entrenar, afinar o desarrollar modelos de IA, extendida a derivados anonimizados
o agregados** (patrón Human Layer Lab); prohibición de copiar datos productivos a entornos no
productivos o a herramientas de terceros (esta cláusula es, además, el escudo frente a los
arts. 20 y 22 LECDI); autorización general de subencargados con lista nominal y preaviso de
14 días con ventana de objeción de 7 (patrón Trust3); notificación de brechas en **72 h** al
cliente (no al regulador — Higerotech es encargado); asistencia en derechos de los
interesados **con coste**; devolución o borrado en **30 días** al terminar; derechos de
auditoría **acotados** (una auditoría al año, con preaviso, a coste del cliente, o informe
propio en su lugar) — sin esa acotación, un banco puede auditar a voluntad a una empresa de
una persona; y **tope de responsabilidad que también cubra el DPA**, porque el error clásico
es poner el tope en el MSA y dejar el DPA sin tope.

**(c) Proveedor que entrega y no opera.** Lo que traslada la responsabilidad, en orden de
eficacia: (1) **acta de entrega y aceptación** que fije la fecha en que cesa el acceso de
Higerotech, con revocación documentada de credenciales; (2) declaración expresa de que **el
cliente es el único responsable/controlador** del tratamiento en el sistema entregado y de su
configuración, despliegue, operación, copias de respaldo y decisiones de retención; (3)
**garantía limitada en tiempo y alcance** (corrección de defectos reproducibles durante N
meses), con exclusión expresa de garantía de resultado; (4) exclusión de responsabilidad por
modificaciones del cliente o de terceros al código entregado; (5) **cláusula 8th Light**:
ninguna relación profesional nace del sitio web ni de correspondencia — solo de un contrato
escrito firmado.

**El hueco transversal:** hoy no hay ningún documento que diga en qué escenario se está. La
primera decisión del owner no es legal, es comercial: **¿Higerotech opera sistemas de
terceros, o solo los construye y entrega?** La respuesta cambia todo lo demás.

---

## 5. Recomendación accionable

### 5.1 Documentos a producir, priorizados

**Imprescindible (bloquea la venta o deja riesgo abierto hoy):**

| # | Documento | Riesgo que cubre | Rol que documenta |
|---|---|---|---|
| D1 | **Política de Privacidad del sitio** (ES/EN) | Coherencia entre lo publicado y lo real (IPs, Cloudflare, `localStorage`); arts. 28 y 60 CRBV; arts. 13/14 GDPR si hay visitantes UE | (a) Responsable |
| D2 | **Términos de Uso del sitio** (ES/EN) | "AS IS", exclusión de daños indirectos, PI del contenido, y sobre todo la **cláusula 8th Light**: navegar el sitio no crea relación consultor-cliente | (a) |
| D3 | **Condiciones Generales de Servicio / MSA plantilla** | El riesgo grande: responsabilidad ilimitada, PI del entregable, confidencialidad, ley aplicable y foro, garantía limitada, no-garantía de resultados de IA | (b) y (c) |
| D4 | **DPA / Acuerdo de Tratamiento de Datos** (anexo firmable) | Que un banco imponga su DPA sin topes; art. 28 GDPR si el cliente es europeo; exposición penal de los arts. 20 y 22 LECDI | (b) Encargado |
| D5 | **Aviso de tratamiento para prospectos** (media página, enlazado desde el `mailto:` y el WhatsApp) | Datos que llegan por correo y WhatsApp sin base documentada. Es el tratamiento **real** que existe hoy | (a) |

**Recomendado (diferenciador comercial o cierre de hueco identificado):**

| # | Documento | Riesgo / valor |
|---|---|---|
| D6 | **Política de IA Responsable y Uso de Datos en IA** | **Nadie en el benchmark la tiene (0/12).** Alineada con los nueve principios del Código de Ética venezolano de febrero de 2026. Contiene la cláusula de **no-entrenamiento**, que es el diferenciador comercial más barato disponible |
| D7 | **Lista de subencargados / proveedores** (página viva, con fecha) | Solo 1 de 12 la publica. Responde de golpe media checklist de due diligence. Debe incluir Cloudflare y los proveedores de modelos que Higerotech use |
| D8 | **Anexo de Cumplimiento Sectorial (SUDEBAN)** | Delimita por escrito qué hace y qué **no** hace Higerotech bajo la Resolución 001-21. Cierra el riesgo de aparentar ser una ITFB autorizada (§1.6) |
| D9 | **`/.well-known/security.txt`** (RFC 9116) + enlace a `SECURITY.md` | **0 de 6 comprobados lo tienen.** Coste: un archivo de seis líneas. Coherente con la tesis técnica que vende la landing |
| D10 | **Aviso Legal / identificación de la entidad** | Razón social, RIF, domicilio y correo de contacto. Barato y lo exige cualquier comprador serio |
| D17 | **Carpeta de addenda pre-firmados de transferencia internacional** | Convierte tres obstáculos regulatorios en ventaja comercial: (a) **SCCs de la Decisión 2021/914, Módulos Dos y Tres**, con Higerotech como **importador**, más una **nota de contexto legal venezolano** para el *Transfer Impact Assessment* del cliente europeo; (b) **Anexo II de la Disposición 60-E/2016** argentina, sin el cual la transferencia a Venezuela está **prohibida** por el art. 12; (c) **contrato de transmisión del Decreto 1377/2013** colombiano. Es lo que el comprador pide y lo que retrasa las firmas |
| D18 | **Responsibility matrix PCI DSS** por servicio | Lo exige el req. 12.9.2 (y el cliente por el 12.8.5). Requisito por requisito, con tres estados: Higerotech / cliente / compartido. Entregable estándar del *onboarding* |
| D19 | **Evaluación interna de aplicabilidad del RGPD y del art. 27** (1–2 páginas, no se publica) | Deja escrito el razonamiento del §2.2 con los factores del EDPB contrastados contra los hechos del repositorio, más el **LIA del art. 6.1(f)** citando el Recital 49 y *Breyer*. Es la única defensa útil si alguien pregunta, y cuesta una tarde |

**Posterior (cuando haya hecho detonante):**

| # | Documento | Detonante |
|---|---|---|
| D11 | Política de Cookies | Solo si se añade analítica o cookies. **Hoy no aplica y decirlo es un activo** |
| D12 | Aviso de privacidad de candidatos | Cuando se contrate personal o se reciban CVs |
| D13 | Anexo de Ley de Infogobierno | Si se decide vender al sector público venezolano |
| D14 | Anexo PCI DSS / responsabilidad compartida de pagos | Al primer proyecto de pasarela con datos de titular de tarjeta |
| D15 | SLA contractual | Cuando se venda operación/soporte. **No publicarlo en la web: 0 de 12 lo hacen** |
| D16 | Representante en la UE (art. 27 GDPR) | Solo si se cruza el umbral del art. 3.2 — ver §2 |

### 5.2 Esqueletos de sección

**D1 — Política de Privacidad del sitio**

1. *Quiénes somos y cómo contactarnos* — identifica a la entidad responsable y el canal de ejercicio de derechos.
2. *Alcance* — deja claro que cubre `higerotech.com`, **no** las aplicaciones que Higerotech desarrolla para clientes.
3. *Qué datos se tratan y qué NO* — inventario honesto: logs técnicos con IP y user-agent; `localStorage` de idioma (que nunca sale del dispositivo); ausencia de formularios, cookies y analítica.
4. *Cloudflare como proveedor de infraestructura* — declara que un tercero ve la IP para entregar el sitio y remite a su DPA y a su lista de subprocesadores.
5. *Finalidades y base de licitud* — seguridad y disponibilidad (interés legítimo); ejecución precontractual para mensajes de prospectos.
6. *Plazos de retención* — cifras reales, no "el tiempo necesario".
7. *Transferencias internacionales* — el hecho y el mecanismo (SCCs vía el DPA de Cloudflare).
8. *Derechos de las personas* — habeas data del art. 28 CRBV y, para residentes de otras jurisdicciones, sus derechos equivalentes, con un solo procedimiento operativo.
9. *Seguridad* — qué se hace, sin prometer lo que no se tiene.
10. *Cambios y versionado* — fecha de vigencia y enlace al histórico en git.

**D2 — Términos de Uso del sitio**

1. *Aceptación y alcance.* 2. *Uso permitido y prohibido* (scraping, ingeniería inversa, suplantación de marca — riesgo R3 del charter). 3. *Propiedad intelectual del contenido*, con excepción expresa para las tres imágenes de marca servidas con CORP cross-origin. 4. *No hay relación profesional* — la cláusula clave. 5. *Contenido informativo, no asesoramiento.* 6. *Exclusión de garantías ("AS IS").* 7. *Limitación de responsabilidad.* 8. *Enlaces a terceros.* 9. *Ley aplicable y jurisdicción.* 10. *Modificaciones.*

**D3 — Condiciones Generales de Servicio / MSA**

1. *Definiciones y orden de prelación de documentos* (SOW > anexos > condiciones generales).
2. *Objeto y modalidad* — **distingue expresamente desarrollo-y-entrega de desarrollo-y-operación** (§4).
3. *Alcance, entregables y control de cambios.*
4. *Honorarios, moneda, impuestos e IGTF* — quién soporta qué, con la alícuota vigente referida por remisión, no por cifra fija.
5. *Aceptación y acta de entrega* — fija la fecha en que cesa el acceso y la responsabilidad operativa.
6. *Propiedad intelectual* — entregable e inputs del cliente para el cliente; metodologías, frameworks, plantillas y herramientas preexistentes para Higerotech, con licencia de uso al cliente.
7. *Confidencialidad y secreto bancario* — incluye supervivencia tras la terminación.
8. *Protección de datos* — remite al DPA como anexo.
9. *Uso de inteligencia artificial* — declara que se usan herramientas de IA en el desarrollo, con revisión humana, y remite a D6.
10. *Garantía limitada y exclusiones* — defectos reproducibles durante N meses; **no** garantía de resultado, de exactitud de salidas de IA, ni de aprobación regulatoria.
11. *Limitación de responsabilidad* — tope cuantificado, exclusión de indirectos, y **el tope cubre también el DPA**.
12. *Indemnidad* — recíproca y acotada.
13. *Dependencias del cliente* — accesos, datos, decisiones y aprobaciones regulatorias son suyos; el retraso imputable al cliente no es incumplimiento.
14. *Subcontratación.* 15. *Terminación y sus efectos.* 16. *Fuerza mayor* — incluye cortes de electricidad y conectividad, realismo venezolano. 17. *Cesión, notificaciones, divisibilidad.* 18. *Ley aplicable y resolución de disputas.*

**D4 — DPA**

1. *Objeto, roles y duración.* 2. *Descripción del tratamiento* (anexo I: categorías de datos, interesados, finalidades, duración). 3. *Instrucciones documentadas y límites.* 4. *Confidencialidad del personal.* 5. *Medidas técnicas y organizativas* (anexo II, concretas y verificables). 6. *Prohibición de uso secundario* — incluye la cláusula de no-entrenamiento de modelos. 7. *Prohibición de datos productivos en entornos no productivos.* 8. *Subencargados* — lista nominal, preaviso y objeción. 9. *Transferencias internacionales.* 10. *Derechos de los interesados — asistencia y coste.* 11. *Notificación de incidentes en 72 h.* 12. *Auditoría acotada.* 13. *Devolución y borrado en 30 días.* 14. *Responsabilidad — remisión al tope del MSA.* 15. *Anexos I y II.*

**D6 — Política de IA Responsable**

1. *Principios* — los nueve del Código de Ética venezolano (19-feb-2026), citados como marco voluntario.
2. *Dónde usa Higerotech IA* — en su propio proceso de desarrollo y en los sistemas que entrega.
3. *Qué NO se hace con los datos del cliente* — entrenar, afinar, ni desarrollar modelos, incluidos derivados anonimizados o agregados.
4. *Revisión humana obligatoria* — las salidas de IA son apoyo a la decisión, nunca decisión automatizada sin intervención humana.
5. *Modelos AML/CFT y perfilado* — el cliente es responsable del umbral, de la decisión y de la explicación al afectado; Higerotech provee la herramienta y la trazabilidad.
6. *Trazabilidad y auditoría de las salidas.*
7. *Proveedores de modelos* — remite a D7.
8. *Limitaciones conocidas y qué no se garantiza.*

**D8 — Anexo de Cumplimiento Sectorial (SUDEBAN)**

1. *Qué es la Resolución 001-21 y a quién obliga.* 2. *Qué hace Higerotech* — diseña y construye controles para que la entidad regulada demuestre su cumplimiento. 3. *Qué NO hace Higerotech* — no está autorizada como ITFB, no presta servicios financieros por cuenta propia, no custodia fondos. 4. *Reparto de responsabilidades regulatorias.* 5. *Cooperación en auditorías e inspecciones de SUDEBAN.* 6. *Secreto bancario.* 7. *Limitaciones y ausencia de garantía de aprobación regulatoria.*

### 5.3 Cláusulas concretas de alto valor

| # | Cláusula | Punto clave (una o dos frases) | De dónde sale |
|---|---|---|---|
| C1 | **No hay relación profesional** | El uso del sitio, la lectura de su contenido o la correspondencia previa no crean relación consultor-cliente; la relación nace exclusivamente de un contrato escrito firmado por un representante autorizado de Higerotech. | Benchmark: **8th Light** (`8thlight.com/terms-of-use`) |
| C2 | **No-entrenamiento con datos del cliente** | Higerotech no usa datos del cliente para entrenar, afinar ni desarrollar modelos de IA, y esta prohibición se extiende a los datos en cualquier forma, **incluidos derivados anonimizados o agregados**. | Benchmark: **Human Layer Lab** — único del set que lo redacta |
| C3 | **Tope de responsabilidad de 12 meses** | La responsabilidad agregada de Higerotech por cualquier reclamación no excederá los honorarios efectivamente pagados por el cliente en los 12 meses anteriores a la reclamación, y **este tope se aplica igualmente a las obligaciones del DPA**. | Benchmark: **Human Layer Lab** (12 meses es el valor público de referencia); el añadido del DPA corrige el error clásico |
| C4 | **Reparto de PI** | El cliente es titular del entregable y de sus datos de entrada; Higerotech retiene la titularidad de sus metodologías, frameworks, esquemas, plantillas y herramientas preexistentes, y concede al cliente una licencia no exclusiva e intransferible para usarlas dentro del entregable. | Benchmark: **Human Layer Lab**, patrón común 5 |
| C5 | **Prohibición de datos productivos fuera de producción** | Está prohibido copiar, exportar o transmitir datos personales productivos del cliente a entornos de desarrollo o prueba, dispositivos personales o servicios de terceros, incluidas herramientas de IA; los entornos no productivos usan datos sintéticos o anonimizados. | **Ley Especial contra los Delitos Informáticos, arts. 20 y 22** — es la cláusula que previene el delito penal, no solo el incumplimiento |
| C6 | **Notificación de brechas en 72 h** | Higerotech notificará al cliente sin demora indebida y en todo caso dentro de las 72 horas siguientes a tener conocimiento de una violación de seguridad que afecte datos tratados por cuenta del cliente. | Benchmark: **HLL** y **Endava**; alineado con el art. 33 GDPR |
| C7 | **Auditoría acotada** | El cliente puede auditar el cumplimiento una vez por año calendario, con 30 días de preaviso, en horario laboral, a su coste y bajo confidencialidad; Higerotech puede satisfacer la solicitud entregando un informe de evaluación vigente. | Necesidad estructural de una empresa de una persona; patrón habitual en los DPA del benchmark |
| C8 | **Subencargados con objeción** | Higerotech mantiene una lista pública de subencargados y notificará cualquier alta con 14 días de preaviso; el cliente puede objetar razonadamente dentro de 7 días. | Benchmark: **Trust3 AI / Privacera** |
| C9 | **Salidas de IA como apoyo, no decisión** | Las salidas de los sistemas de IA son de carácter consultivo y no vinculante; el cliente conserva la decisión final y no debe usarlas sin revisión humana, especialmente en decisiones con efecto jurídico o económico sobre personas. | Benchmark: **HLL**; **art. 22 GDPR** para clientes con interesados en la UE |
| C10 | **Responsabilidad regulatoria del cliente** | El cliente es el único responsable del cumplimiento regulatorio de su actividad, incluidos los umbrales, parámetros y decisiones de sus modelos AML/CFT, y de la obtención de cualquier autorización o no objeción de su supervisor; Higerotech no garantiza aprobación regulatoria alguna. | **Resolución 001-21 de SUDEBAN** (el sujeto obligado es la entidad regulada o la ITFB autorizada, no el proveedor) |
| C11 | **Sin cookies, sin analítica — y es una decisión** | El sitio no emite cookies ni ejecuta analítica; la preferencia de idioma se guarda en el almacenamiento local del navegador y no se transmite al servidor. | Estado real del repo (charter §No incluye, `data-classification.md`). **Es una ventaja competitiva: dilo** |
| C12 | **Aceptación electrónica** | La aceptación por medios electrónicos de estos términos tiene plena validez y eficacia probatoria. | **Ley sobre Mensajes de Datos y Firmas Electrónicas, art. 4** (G.O. 37.148, 28-feb-2001) |
| C13 | **Fuerza mayor con realismo local** | Se incluyen entre los supuestos de fuerza mayor los cortes prolongados de energía eléctrica y de conectividad, y las restricciones cambiarias o de pagos internacionales. | Contexto operativo venezolano; el charter ya asume conexiones intermitentes |
| C14 | **Exclusión de datos de menores** | Los sistemas entregados no están destinados a menores de edad y el cliente se obliga a no tratar datos de niños, niñas o adolescentes sin la base legal y las salvaguardas aplicables. | **LOPNNA art. 65** |
| C15 | **🔴 Ni ley ni foro chilenos** | Ningún contrato con cliente chileno se somete a la ley ni a los tribunales de Chile. | **Ley 21.719, art. 1° bis, inciso final**: la ley aplica a quien *"le resulte aplicable la legislación nacional a causa de un contrato"*. Es la única puerta de entrada que Higerotech puede abrir con su propia firma, y se cierra con una línea |
| C16 | **No hay *output* en la Unión** | El cliente declara y garantiza que no usará, ni permitirá usar, el resultado del sistema en la Unión Europea sin notificación previa por escrito y renegociación de responsabilidades. | **AI Act art. 2(1)(c)**: *"where the output produced by the AI system is used in the Union"* — el gancho extraterritorial más amplio del Reglamento, y no requiere targeting |
| C17 | **El cliente es *provider*; Higerotech no** | El sistema se entrega y se pone en servicio **bajo la marca del cliente**; el cliente es *provider* y *deployer* a todos los efectos, y Higerotech es proveedor de componentes. | **AI Act art. 3(3)** (*provider* es quien coloca *"under its own name or trademark"*) y **art. 25(1)(a)**, que admite expresamente *"contractual arrangements stipulating that the obligations are otherwise allocated"* |
| C18 | **Cooperación del art. 25(4)** | Higerotech se obliga a especificar por escrito la información, capacidades, acceso técnico y asistencia que pone a disposición del *provider* del sistema para que este pueda cumplir el Reglamento — y esa obligación tiene su propio alcance y su propio precio. | **AI Act art. 25(4)**, que exige ese acuerdo *"by written agreement"* |
| C19 | **Arquitectura AML/CFT: nunca puntuar personas por rasgos** | El sujeto de la puntuación es la **transacción** o la **persona jurídica**, a partir de hechos objetivos y verificables; el sistema no puntúa a personas físicas por rasgos de personalidad ni por perfilado puro, y toda alerta requiere revisión humana por alguien con **autoridad real para tomar o cambiar la decisión**. | Cierra a la vez el **AI Act art. 5(1)(d)** (vía Recital 42), el **Anexo III.5(b)**, el **art. 22 GDPR** y el estándar de *human involvement* del **§ 7001(e) del reglamento ADMT de California** — que es el más exigente de los tres y por eso el que conviene adoptar |
| C20 | **Responsabilidad del art. 10 GDPR sobre datos de infracciones** | El cliente declara que, si el sistema trata datos relativos a infracciones o presuntas infracciones de personas en la UE, cuenta con la habilitación legal que exige el art. 10 del RGPD, y Higerotech no asume esa verificación. | **GDPR art. 10**: ese tratamiento solo cabe *"under the control of official authority"* o autorizado por Derecho de la Unión o de un Estado miembro. Las alertas AML/CFT son datos de presuntas infracciones: es una **barrera dura**, no un requisito documental |
| C21 | **Reconocimiento PCI DSS** | Higerotech reconoce por escrito su responsabilidad sobre los datos de cuenta que posea, almacene, procese o transmita por cuenta del cliente, **o en la medida en que pueda afectar la seguridad** de los datos de titular de tarjeta del cliente; y se compromete a atender sus solicitudes de estado de cumplimiento y de reparto de responsabilidades. | **PCI DSS v4.0.1, req. 12.9.1 y 12.9.2.** El estándar advierte que un AOC, una declaración en la web o una matriz de responsabilidad **NO** sustituyen el reconocimiento **en el acuerdo** |
| C22 | **Qué SAQ habilita la arquitectura entregada** | Se deja por escrito qué cuestionario de autoevaluación (SAQ A o SAQ A-EP) habilita el diseño entregado, y que cualquier cambio del cliente —añadir un script propio a la página de pago, pasar de redirección a *Direct Post*— puede recalificarlo, con las consecuencias a su cargo. | **PCI DSS v4.0.1**, criterios de elegibilidad de SAQ A y A-EP. Protege a Higerotech de la reclamación *"tu diseño me metió en A-EP"* |
| C23 | **Service provider de California** | El contrato prohíbe expresamente vender o compartir los datos, retenerlos o usarlos para cualquier fin distinto de las finalidades comerciales **enumeradas en el contrato**, usarlos fuera de la relación comercial directa, y **combinarlos** con datos de otros clientes; e incluye la notificación de cada subencargado y su vinculación por contrato escrito. | **CCPA § 1798.140(ag)(1)(A)–(D) y (ag)(2)** y **Cal. Code Regs. tit. 11 § 7051(a)**. Sin esto **se pierde el estatus de service provider y la transferencia se recalifica como *sale/share*** — y el § 1798.155 alcanza directamente al *service provider* |

### 5.4 Coherencia con el sitio y la documentación actuales

**Lo que choca — y cómo matizarlo.**

**(1) `data-classification.md` afirma: "Este sistema no recolecta, procesa ni almacena datos
personales… Por eso no aplican GDPR, LOPD ni normativa de protección de datos: no hay
tratamiento que regular."**

Esa conclusión **no se sostiene tal cual**. Tres razones, en orden de gravedad:

- **Cloudflare — el actor que falta en el inventario.** El sitio se sirve hoy desde
  **Cloudflare Workers** (`wrangler.jsonc`, `worker/index.mjs`). Cloudflare **recibe y trata la
  IP de cada visitante** en el borde para poder entregar la respuesta. Su propio DPA lo dice:
  el cliente es el **controlador** y Cloudflare el **procesador**, y los "Customer Logs"
  incluyen direcciones IP. Es decir: **hay tratamiento y hay un encargado extranjero**. El
  inventario actual no menciona a Cloudflare en ninguna fila. **Esto es un error de inventario,
  no una opinión.**
- **⚠️ Y el énfasis está puesto en el sitio equivocado.** Se leyó el código: `worker/index.mjs`
  (56 líneas) **no accede a `request.headers` de entrada, ni a `request.cf`, ni a la IP** — hace
  `env.ASSETS.fetch(request)`, copia las cabeceras de **respuesta** y sustituye
  `Cross-Origin-Resource-Policy`. Y `wrangler.jsonc` **no declara bloque `observability`**.
  **En la ruta de producción, Higerotech no genera ni retiene direcciones IP.** Los
  `access_log` de nginx que el documento clasifica como Confidencial **solo existen en la
  variante Docker de contingencia**, que no es el camino canónico desde el cutover a Workers.
  **⇒ El vector real es el log de borde de Cloudflare, no el de nginx.** Esto es mejor de lo
  que dice la clasificación actual, pero descrito de otra manera, y hay que reescribirlo así:
  es demostrable auditando 56 líneas, que es un argumento de due diligence mucho más fuerte
  que "rotamos los logs agresivamente".
- **Los logs de nginx.** El propio documento ya reconoce, en las notas, que *"es el único dato
  del inventario que puede considerarse personal: una dirección IP lo es bajo criterio
  europeo"* y lo clasifica como Confidencial. Eso **contradice** la conclusión de portada, que
  dice que no hay tratamiento. La contradicción está dentro del mismo archivo. Matiz jurídico
  aprovechable: el TJUE, en ***Breyer* (C-582/14)**, condicionó el carácter de dato personal de
  una IP dinámica a que el operador tenga *"the legal means which enable it to identify the
  data subject"* — en Venezuela, sin orden judicial ejecutable contra un ISP extranjero, ese
  medio legal es al menos discutible. No es una defensa para apoyarse en ella, pero sí un
  matiz que la clasificación puede recoger.
- **Correo y WhatsApp.** El charter sacó el formulario de contacto del alcance razonando que
  *"sin formulario no hay datos personales que custodiar"*. Pero el canal de contacto **sí
  existe**: es `mailto:` y WhatsApp. Un prospecto que escribe envía su nombre, su correo, su
  empresa y el contenido de su consulta, y Higerotech lo conserva en su bandeja. **Quitar el
  formulario eliminó la validación de entrada y el CAPTCHA, no el tratamiento.**

**Redacción que sí se sostiene**, y que además sigue siendo un argumento comercial fuerte:

> El sitio no emite cookies, no ejecuta analítica, no tiene formularios ni backend, y no
> construye perfiles de sus visitantes. El único dato personal que interviene es la dirección
> IP, tratada de forma transitoria por el proveedor de infraestructura (Cloudflare) para
> entregar la página y por el servidor de contingencia en registros técnicos de rotación
> agresiva, con base en el interés legítimo de seguridad y disponibilidad.

**(2) El charter declara fuera de alcance "formularios, cookies y analítica".** Eso sigue
siendo cierto y no hay que cambiarlo. Lo que hay que cambiar es la **inferencia**: "no hay
formularios" ⇒ "no hay tratamiento de datos personales" es un salto lógico inválido cuando el
sitio se sirve a través de un tercero y se publica un `mailto:`.

**(3) La afirmación "no aplican GDPR, LOPD"** tiene además un problema de precisión:
**no existe ninguna "LOPD" venezolana** (ver §1.2). Citar una norma inexistente en un
documento aprobado es un error a corregir aunque la conclusión de fondo fuera correcta.

**(4) Declaraciones de la landing con riesgo publicitario.** `index.html` muestra hoy
**99,99 % como "Disponibilidad (SLA) objetivo"** en una tarjeta de estadísticas, y una tarjeta
de SLA con 99,9 % / 99,99 % / 99,999 %. El propio charter reconoce que el SLO real de la
landing es 99,5 % y que *"con un contenedor en un host sin réplica, prometer más sería falso"*.
La distinción está clara en el charter, pero **un visitante no lee el charter**. Riesgo: art. 26
LECDI (oferta engañosa por medios tecnológicos) y publicidad engañosa bajo el régimen SUNDDE.
**Mitigación barata:** los términos de uso declaran que las cifras de disponibilidad son
niveles de servicio ofrecidos **contractualmente por proyecto**, no un compromiso sobre este
sitio ni una garantía general.

**(5) Lo que hay que actualizar (fuera de este documento y previa decisión del owner):**

- `data-classification.md` — añadir fila para **Cloudflare como encargado** y para la
  transferencia internacional; **corregir el énfasis**: el dato personal vive en el borde de
  Cloudflare, no en los logs de nginx (que son de la variante de contingencia), y en la ruta de
  producción el Worker no lee la IP; reformular la conclusión de portada; borrar la referencia a
  "LOPD"; resolver el `<TODO>` sobre desactivar el registro de IP en nginx (si se decide
  desactivarlo, la política queda aún más fuerte y el documento queda coherente en las dos
  rutas).
- **Comprobar y documentar el estado del *logging* de borde de Cloudflare** (Logpush, Logpull,
  Web Analytics, `observability` a nivel de cuenta). Es el hecho del que depende la defensa
  bajo la LGPD brasileña y buena parte de la política de privacidad. **No basta con que el
  repositorio no lo active: hay que mirar el panel.**
- `charter.md` — matizar la justificación del no-scope del formulario: la razón real es reducir
  superficie de ataque y validación de entrada, no eliminar el tratamiento.
- `SECURITY.md` — resolver el `<TODO>` del buzón dedicado y enlazar el futuro `security.txt`.

### 5.5 Decisiones que el owner debe tomar antes de redactar

1. **¿Cuál es la entidad legal?** Razón social exacta, RIF, domicilio fiscal y registro
   mercantil. Sin esto **no se puede firmar nada** y la política no tiene sujeto. Si hoy opera
   como persona natural, decidir si se constituye sociedad **antes** de firmar el primer MSA
   con un banco (la responsabilidad personal ilimitada es el riesgo real, no la multa).
2. **¿Higerotech opera sistemas de terceros, o solo los construye y entrega?** Determina si
   hace falta D4 (DPA) desde el día uno y si se entra en el ámbito de la Resolución 001-21.
   **Es la decisión que más cambia el resultado.**
3. **¿Ley aplicable y foro?** Recomendación: derecho venezolano y tribunales de la sede.
   ¿Acepta arbitraje? Si vende a clientes fuera de Venezuela, un arbitraje neutral es más
   negociable que sus tribunales — pero cuesta dinero que una empresa de una persona no tiene.
4. **¿Publicación bilingüe ES/EN o solo ES?** Cuidado: publicar en inglés es un factor que
   pesa en el análisis de "dirigirse a" personas de la UE (ver §2). Si se publica en EN, la
   versión ES debe declararse como versión prevalente.
5. **Plazos de retención concretos** para: logs técnicos, correos de prospectos, mensajes de
   WhatsApp, documentación de proyecto tras el cierre. Cifras, no fórmulas.
6. **¿Se ofrece DPA firmable, o se acepta el del cliente?** Ofrecer el propio es la diferencia
   entre negociar y firmar lo que pongan.
7. **Tope de responsabilidad**: ¿12 meses de honorarios (referencia del benchmark), un múltiplo
   del valor del proyecto, o una cifra absoluta como hizo Tribe AI? ¿Cubre también el DPA?
8. **¿Se compromete a no entrenar modelos con datos de cliente?** Si la respuesta es sí (y
   debería), hay que verificar que **las herramientas de IA que se usan internamente** lo
   permitan contractualmente antes de prometerlo.
9. **¿Qué subencargados se declaran?** Como mínimo: Cloudflare, el proveedor de correo, y los
   proveedores de modelos de IA que se usen. ¿Se acepta publicar esa lista?
10. **¿Se desactiva el registro de IP en los logs?** Resuelve el `<TODO>` pendiente de
    `data-classification.md` y simplifica la política, a cambio de capacidad de diagnóstico.
11. **¿Se corrigen las cifras de SLA de la landing** o se acota su significado en los términos?
12. **¿Se pretende vender al sector público venezolano?** Activa la Ley de Infogobierno como
    anexo separado.
13. **¿Quién revisa esto legalmente?** Esta investigación **no es asesoramiento jurídico**. Un
    abogado venezolano debe revisar D3, D4 y D8 antes de firmarlos con una entidad regulada.

**Y tres cosas que no son decisiones sino tareas, ordenadas por rendimiento:**

| # | Tarea | Por qué primero |
|---|---|---|
| T1 | **Verificar en el panel de Cloudflare que el DPA está aceptado y guardar el comprobante con fecha** | Su cláusula de efectividad es *"from the date on which Customer signed or the parties otherwise agreed"*. Sin eso no hay contrato de encargo. **Coste: minutos** |
| T2 | **Verificar y documentar el estado de Logpush / Logpull / Web Analytics / `observability`** en la cuenta de Cloudflare | Es el hecho del que depende la defensa bajo el art. 3 III de la LGPD y la redacción honesta de la política. El repositorio no los activa, pero la cuenta es otra capa |
| T3 | **Antes del 1 de diciembre de 2026: revisar todo MSA con cliente chileno y quitar ley y foro chilenos** | Cierra el inciso final del art. 1° bis de la Ley 21.719, la única puerta que Higerotech puede abrir con su propia firma. **Coste: una línea de texto** |

### 5.6 Trampas a evitar — afirmaciones que la política NO debe hacer

| No decir | Por qué |
|---|---|
| "Cumplimos el GDPR" / "Somos GDPR compliant" | Declararlo obliga a todo el paquete (registro de actividades, DPIA, representante del art. 27, respuesta en plazo). Decir en su lugar: *"aplicamos principios alineados con el RGPD"* y describir solo lo que se hace de verdad |
| "Cumplimos la LOPD" | **No existe ninguna LOPD venezolana.** Citar una norma inexistente destruye la credibilidad de todo el documento |
| "Estamos certificados por SUDEBAN" / "Cumplimiento SUDEBAN" sin matiz | No hay certificación de SUDEBAN para proveedores tecnológicos. Si además se prestan servicios financieros por tecnología sin autorización como ITFB, el problema deja de ser publicitario |
| "Certificados ISO 27001 / SOC 2 / PCI DSS" | Solo si existe el certificado, con su número y organismo. Ninguna boutique del benchmark declara certificaciones que no tiene |
| "No recolectamos ningún dato personal" | Falso mientras haya IPs en logs y Cloudflare en el camino. Es exactamente la afirmación que convierte un riesgo bajo en una declaración engañosa |
| "Garantizamos 99,99 % de disponibilidad" (sin contrato detrás) | El charter reconoce que el SLO real del sitio es 99,5 %. Riesgo de oferta engañosa (art. 26 LECDI) y publicidad engañosa (régimen SUNDDE) |
| "Nuestros modelos de IA garantizan la detección de operaciones sospechosas" | Ninguna garantía de resultado en IA. El benchmark muestra que quien lo hace bien declara las salidas *"advisory, non-binding"* y exige revisión humana |
| "Sus datos nunca salen de Venezuela" | Falso: Cloudflare es una red global. Si se quiere decir algo parecido, hay que decirlo del entorno **del cliente**, no del sitio |
| "Cumplimos la Ley de Protección de Datos de Venezuela" | No hay tal ley. Lo correcto es invocar los **arts. 28 y 60 CRBV** y la jurisprudencia de la Sala Constitucional |
| "Cumplimos el EU AI Act" / "la Ley de IA venezolana" | Ver §2 para el AI Act. La ley venezolana de IA **es un anteproyecto**, no norma vigente; citarla como vigente es un error |
| Prometer supresión total de datos sin excepciones | Hay datos que no se pueden borrar (obligaciones contables y fiscales, auditoría inmutable exigida al cliente bancario). Declarar las excepciones desde el principio |
| Copiar una plantilla sin cerrarla | El benchmark tiene el ejemplo: **Aimpoint Digital** declara ley de Florida y foro en Georgia. Una contraparte con abogados lo usa |
| "El RGPD ya da 96 horas para notificar brechas" | El plazo de 96 h es del ***Digital Omnibus*, COM(2025) 837 final de 19-11-2025, que es una PROPUESTA**. El derecho vigente son las **72 horas del art. 33** |
| Citar cifras de multas de las marcas de tarjeta por incumplir PCI DSS | Las cifras de USD 5.000–100.000/mes que circulan **provienen solo de blogs de vendedores de compliance**. Mastercard publica su calendario en el SPME (no accesible) y el *AIS Program Guide* de Visa **no es público**. **El PCI SSC no impone multas** |
| Presentar un AOC, la web o una matriz de responsabilidad como el reconocimiento escrito de PCI DSS | El estándar lo excluye literalmente: *"other evidence not included in a written agreement is **NOT** a written acknowledgment"* (req. 12.8.2) |
| "Redirigimos el pago, así que estamos fuera del alcance de PCI DSS" | El propio SAQ A dice que los requisitos de protección de sistemas —**2, 6 y 8**— aplican *"specifically to the merchant web server upon which the redirection mechanism is located"*. Redirigir **reduce** el alcance, no lo elimina |
| "No necesitamos representante en la UE porque nuestro tratamiento es ocasional" | El EDPB entiende "occasional" como lo que **no se hace regularmente ni en el curso normal del negocio**. La defensa correcta es que **el art. 3.2 no se activa**, no que la excepción del art. 27.2(a) aplica |
| "Transparencia para el Pueblo es la autoridad mexicana de datos personales" | Es el órgano que asumió las funciones de **transparencia y acceso a la información** del INAI. La autoridad sobre datos en posesión de particulares es la **Secretaría Anticorrupción y Buen Gobierno** (art. 2, fr. XV de la LFPDPPP vigente) |
| "Cumplimos la Ley de IA de Chile / la nueva ley mexicana / la Ley 21.719" | La Ley 21.719 **no está en vigencia hasta el 1 de diciembre de 2026** (y hay un proyecto para postergarla a 2027). Declarar cumplimiento de una norma que aún no rige es igual de malo que negar una que sí |

---

## Fuentes

Todas consultadas el **2026-09-16**.

### Venezuela — normas y fuentes primarias

1. Constitución de la República Bolivariana de Venezuela (arts. 28, 48, 60, 117) — https://www.oas.org/dil/esp/constitucion_venezuela.pdf y https://www.ley.com.ve/constitucion/constitucion-de-la-republica-bolivariana-de-venezuela-articulo-28
2. Ley Especial contra los Delitos Informáticos, Gaceta Oficial N° 37.313 del 30-oct-2001 — https://www.oas.org/juridico/spanish/mesicic3_ven_anexo18.pdf · https://conatel.gob.ve/wp-content/uploads/2024/08/PDF-Ley-Especial-contra-los-Delitos-Informaticos.pdf · art. 22 en UNODC SHERLOC: https://sherloc.unodc.org/cld/es/legislation/ven/ley_especial_contra_los_delitos_informaticos/titulo_ii/articulo_22/articulo_22.html
3. Penas por artículo (LECDI) — https://www.venelogia.com/archivos/10459/
4. Ley sobre Mensajes de Datos y Firmas Electrónicas, Decreto-Ley N° 1.204, G.O. N° 37.148 del 28-feb-2001 — https://www.suscerte.gob.ve/wp-content/uploads/2022/07/Ley-sobre-Mensajes-de-Datos-y-Firmas-Electronicas.pdf · https://www.asambleanacional.gob.ve/leyes/sancionadas/decreto-no-1204-con-rango-y-fuerza-de-ley-de-mensajes-de-datos-y-firmas-electronicas
5. Ley Sobre Protección a la Privacidad de las Comunicaciones (1992) — https://www.asambleanacional.gob.ve/leyes/sancionadas/ley-sobre-proteccion-a-la-privacidad-de-las-comunicaciones
6. Ley Orgánica de Telecomunicaciones (art. 12) — https://www.suscerte.gob.ve/wp-content/uploads/2022/10/Ley_organica_de_telecomunicaciones.pdf
7. Ley de Infogobierno, G.O. N° 40.274 del 17-oct-2013 — https://www.conati.gob.ve/wp-content/uploads/Ley-de-infogobierno.pdf · https://cnti.gob.ve/ley-de-infogobierno/
8. LOPNNA art. 65 — https://www.ley.com.ve/lopnna/lopnna-articulo-65-derecho-al-honor-reputacion-propia-imagen-vida-privada-e-intimidad-familiar
9. Ley de Instituciones del Sector Bancario, Decreto-Ley N° 1.402, G.O. Extraordinaria N° 6.154 del 13-nov-2014 (art. 89, secreto bancario) — https://www.asambleanacional.gob.ve/storage/documentos/leyes/ley-de-ref-20220117174750.pdf
10. Ley Orgánica de Precios Justos y SUNDDE — https://www.sundde.gob.ve/?p=36023 · https://www.ucv.ve/fileadmin/user_upload/cendes/Ley-Org%C3%A1nica-de-Precios-Justos.pdf · https://www.nortonrosefulbright.com/-/media/files/nrf/nrfweb/imported/nueva-ley-orgnica-de-precios-justos-pdf-111kb.pdf
11. Proyecto de Ley de Derechos Socioeconómicos (primera discusión, 22-ene-2026) — https://lga.lagranaldea.com/2026/01/29/el-proyecto-de-ley-de-derechos-socioeconomicos-una-reforma-gatopardiana/ · https://diariodelosandes.com/nueva-ley-de-derechos-socioeconomicos-borra-la-sundde-pero-mantiene-el-control-de-precios/
12. Unidad Tributaria Bs. 43 — G.O. N° 43.140 del 2-jun-2025, Providencia SNAT/2025/000048 — https://www.pwc.com/ve/es/assets/documentos/stl/NAC-Reajuste-Valor-UT-Junio2025-v3-2.pdf · https://www.nompli.com/blog/unidad-tributaria-seniat-2026-valor-vigente
13. IGTF, alícuota 0 % en bolívares por Decreto N° 4.972, G.O. Extraordinaria N° 6.821 del 12-jul-2024 — https://accesoalajusticia.org/fijada-en-cero-por-ciento-0-la-alicuota-del-impuesto-a-las-grandes-transacciones-financieras-igtf/ · https://www.forvismazars.com/ve/es/insights/forvis-mazars-insights/se-fija-en-0-la-alicuota-del-igtf

### Venezuela — ausencia de ley de datos, jurisprudencia y autoridad

14. DLA Piper, *Data Protection Laws of the World — Venezuela* — https://www.dlapiperdataprotection.com/index.html?t=law&c=VE
15. Espacio Público, *¿En Venezuela se regula la protección de datos personales?* — https://espaciopublico.ong/en-venezuela-se-regula-la-proteccion-de-datos-personales/
16. Transparencia Venezuela, *En Venezuela no existe una Ley que resguarde los datos personales* — https://transparenciave.org/project/en-venezuela-no-existe-una-ley-que-resguarde-los-datos-personales/
17. IAPP, *Venezuela data breach highlights scattered privacy regulation* — https://iapp.org/news/a/venezuela-data-breach-highlights-scattered-privacy-regulation
18. Global Compliance News, *Data Protection Enforcement in Venezuela* — https://www.globalcompliancenews.com/data-privacy/data-protection-enforcement-in-venezuela/
19. TSJ, Sala Constitucional, Sentencia N° 1318 del 4-ago-2011 (ponente Carmen Zuleta de Merchán) — http://historico.tsj.gob.ve/decisiones/scon/agosto/1318-4811-2011-04-2395.HTML **(no accesible: certificado autofirmado)**; referencia en https://vlexvenezuela.com/vid/german-jose-mundarain-hernandez-311569838 y http://historico.tsj.gob.ve/cuentas/scon/2011/cuentascon-04082011.htm
20. Espacio Público, *Protección de datos en Venezuela según la Sala Constitucional* — https://espaciopublico.ong/proteccion-de-datos-en-venezuela-segun-la-sala-constitucional/ **(contenido no extraíble)**

### Venezuela — SUDEBAN

21. Acceso a la Justicia, *SUDEBAN regula los servicios de tecnología financiera (Fintech)* — https://accesoalajusticia.org/sudeban-regula-servicios-de-tecnologia-financiera-fintech/ **(fuente principal para G.O. N° 42.151 del 17-jun-2021, resolución fechada 4-ene-2021, requisitos de ITFB y art. 28)**
22. Interjuris, resumen de la Resolución N° 001-21 y su reimpresión — https://interjuris.com/resolucion-n-001-21-mediante-la-cual-se-dictan-las-normas-que-regulan-los-servicios-de-tecnologia-financiera-fintech/ · https://interjuris.com/reimpresion-de-la-resolucion-no-001-21-mediante-la-cual-se-dictan-las-normas-que-regulan-los-servicios-de-teconologia-financiera-fintech/
23. Grant Thornton Venezuela, boletín sobre las Normas FINTECH — https://www.grantthornton.com.ve/globalassets/1.-member-firms/venezuela/2021-pdf/normas-que-regulan-los-servicios-de-tecnologia-financiera-fintech.pdf **(PDF; extracción parcial poco fiable, no se usó para citas de artículo)**
24. PwC Venezuela, boletín sobre las Normas FINTECH — https://www.pwc.com/ve/es/publicaciones/assets/PublicacionesNew/Boletines/Normas%20que%20regulan%20los%20servicio%20de%20tecnologia%20financiera_Junio2021_Rev%20AA.pdf **(HTTP 403)**
25. Derecho y Sociedad, *El Servicio de Tecnología Financiera (Fintech) y las ITFB* — https://www.derysoc.com/el-servicio-de-tecnologia-financiera-fintech-y-las-instituciones-de-tecnologia-del-sector-bancario-itfb-tendencia-en-venezuela/
26. SUDEBAN, Resolución 641.10 — Normas que regulan el uso de los servicios de la Banca Electrónica (y remisión a la Circular SBIF-DSB-IO-GGT-GRT-01907 del 30-ene-2008) — https://www.ks7000.net.ve/Gaceta_Oficial/GO_39597.pdf · https://www.cuentasclarasdigital.org/wp-content/uploads/2013/07/Resoluci%C3%B3n-641-10-Banca-Electr%C3%B3nica.pdf

### Venezuela — inteligencia artificial

27. Baker McKenzie, *Venezuela: Code of Ethics for Artificial Intelligence* (Código publicado el 19-feb-2026 por el MPPCT) — https://www.bakermckenzie.com/en/insight/publications/2026/03/venezuela-code-of-ethics-for-artificial-intelligence
28. Bentata, *Venezuela's AI Bill and the Intellectual Property Gap* (Anteproyecto de Ley de IA, 13-nov-2024, primera discusión 19-nov-2024) — https://bentata.com/venezuelas-ai-bill-and-the-intellectual-property-gap/
29. Baker McKenzie Connect On Tech, *Emerging AI Regulations in Latin America* — https://connectontech.bakermckenzie.com/emerging-ai-regulations-in-latin-america-what-multinationals-need-to-know/

### Cloudflare como encargado

30. Cloudflare Data Processing Addendum — https://www.cloudflare.com/cloudflare-customer-dpa/
31. Cloudflare, lista de subprocesadores — https://www.cloudflare.com/gdpr/subprocessors/
32. Cloudflare Privacy Policy — https://www.cloudflare.com/privacypolicy/ · https://github.com/cloudflare/Cloudflare-Policies/blob/master/privacy-policy.md
33. Cloudflare Logs, *Enabling log retention* — https://developers.cloudflare.com/logs/logpull/enabling-log-retention/

### Marcos extraterritoriales (§2) — fuentes primarias

**Unión Europea — RGPD**

34. Reglamento (UE) 2016/679 (RGPD), texto íntegro: arts. 3, 4, 6, 10, 22, 27, 28, 30, 33, 34, 37, 44, 46, 83; recitales 23, 24, 49 — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679
35. Versión consolidada `02016R0679 — EN — 04.05.2016 — 000.002` (confirma que solo existe el Corrigendum OJ L 127, 23.5.2018: **no hay enmienda sustantiva a 2026**) — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504
36. **COM(2025) 837 final, 2025/0360(COD), de 19.11.2025** — *Digital Omnibus*. **Propuesta, no vigente**: es de donde sale el plazo de 96 h que no debe citarse como derecho — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025PC0837
37. **EDPB, Guidelines 3/2018 on the territorial scope of the GDPR (Article 3), versión 2.1** (adoptadas 12-11-2019; v2.1 de 07-01-2020) — factores de targeting de *Pammer/Alpenhof*, ejemplos 10, 11, 14 y 20, lectura de "occasional" del art. 27.2(a) y encargado de un responsable que hace targeting — https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf
38. Complemento: art. 27 y art. 83 en gdpr-info.eu — https://gdpr-info.eu/art-27-gdpr/ · https://gdpr-info.eu/art-83-gdpr/
39. **Decisión de Ejecución (UE) 2021/914, de 4 de junio de 2021** (SCCs; art. 1(1) y Módulos Dos y Tres, cláusula 8.9) — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32021D0914
40. **Decisión de Ejecución (UE) 2023/1795, de 10 de julio de 2023** (adecuación EU-US DPF; OJ L 231, 20.9.2023, p. 118) — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023D1795 · T-553/23 *Latombe* (3-09-2025) y casación C-703/25 P `[secundarias]`
41. **TJUE, C-582/14 *Breyer*, sentencia de 19 de octubre de 2016** (IP dinámica como dato personal condicionado a los *"legal means"*; operabilidad general del servicio) — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62014CJ0582
42. Comisión Europea, *New Standard Contractual Clauses — Questions and Answers* — https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en

**EU AI Act**

43. **Reglamento (UE) 2024/1689 (AI Act)**: arts. 2, 3, 4, 5, 6, 16, 22, 25, 26, 50, 51, 53, 99, 113; Anexo III punto 5(b); recitales 42 y 58 — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689
44. **Reglamento (UE) 2026/1744, de 8 de julio de 2026** — *Digital Omnibus on AI*; OJ L series 2026/1744 de 24.7.2026; en vigor el 27-07-2026; modifica el art. 113 (alto riesgo Anexo III diferido al 2-dic-2027) y el art. 4 — https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32026R1744
45. Calendario de aplicación consolidado y art. 99 — https://artificialintelligenceact.eu/implementation-timeline/ · https://artificialintelligenceact.eu/article/99/

**Reino Unido**

46. UK GDPR arts. 3 y 27 (con el apartado 3 del art. 27 omitido) — https://www.legislation.gov.uk/eur/2016/679/article/3 · https://www.legislation.gov.uk/eur/2016/679/article/27
47. **Data Protection Act 2018, s.157** (*higher* GBP 17.500.000 / 4 %; *standard* GBP 8.700.000 / 2 %) — https://www.legislation.gov.uk/ukpga/2018/12/section/157
48. **Data (Use and Access) Act 2025, 2025 c. 18** (Royal Assent 19-jun-2025; s.70 art. 6(1)(ea) y Annex 1; s.80 sustituye el art. 22 por los arts. 22A–22D) — https://www.legislation.gov.uk/ukpga/2025/18/introduction
49. S.I. **2026/82** (entrada en vigor el 5-feb-2026 del bloque grueso) y S.I. **2026/1015** (30-sep-2026: abolición de la oficina del Information Commissioner y transferencia a la **Information Commission**) — legislation.gov.uk
50. ICO — ámbito territorial (*"it's not enough just to show that a website is accessible in the UK"*), enforcement, *recognised legitimate interests*, decisiones automatizadas y PECR post-DUAA — https://ico.org.uk/ · https://usercentrics.com/knowledge-hub/data-use-and-access-act-2025-duaa-compliance/

**Brasil**

51. **Lei nº 13.709/2018 (LGPD)**, arts. 3 (incisos I–III y §1º) y 52, texto compilado — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
52. **Resolução CD/ANPD nº 4, de 24 de febrero de 2023** — *Regulamento de Dosimetria e Aplicação de Sanções Administrativas* (arts. 8, 11, 15) — https://bibliotecadigital.mj.gov.br/bitstream/1/9179/2/RES_ANPD_2023_4.html
53. ANPD, sanciones administrativas — https://www.gov.br/anpd/pt-br/acesso-a-informacao/sancoes-administrativas

**Colombia**

54. **Ley Estatutaria 1581 de 2012**, arts. 2 (incluido el literal b) sobre AML/CFT), 19, 23, 24 y 25 — https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981
55. **Circular Externa 003 de 2018 de la SIC** (RNBD: umbral de 100.000 UVT en activos totales, actualización anual entre el 2 de enero y el 31 de marzo) — https://normas.cra.gov.co/gestor/docs/circular_superindustria_0003_2018.htm
56. **Decreto 090 del 18 de enero de 2018** (Diario Oficial No. 50480), que eliminó la obligación de RNBD para personas naturales y entidades bajo el umbral — sic.gov.co / funcionpublica.gov.co / suin-juriscol.gov.co
57. **UVT 2026 = $52.374 COP** (Resolución DIAN 000238 del 15-12-2025) y **SMMLV 2026 = $1.750.905 COP** (Decreto 159 del 19-02-2026) — `<estabilidad jurídica del SMMLV: SIN VERIFICAR>`

**México**

58. **LFPDPPP vigente**, PDF oficial: *"Nueva Ley publicada en el Diario Oficial de la Federación el 20 de marzo de 2025"*, *"TEXTO VIGENTE"*, *"Última reforma publicada DOF 14-11-2025"* — arts. 1, 2 fr. XV, 20, 34–36, 38–39, 51, 58–64 y transitorios — https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
59. Historial de reformas de la LFPDPPP — https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm
60. **UMA 2026 = $117,31 diarios** — INEGI, Comunicado de Prensa 1/26 del 8 de enero de 2026 — https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf
61. Extinción del INAI y nueva autoridad — https://www.ey.com/es_mx/technical/tax/boletines-fiscales/nueva-ley-federal-proteccion-datos-personal-posesion-particulares · https://iapp.org/news/a/se-establece-una-nueva-autoridad-en-materia-de-protecci-n-de-datos-personales-en-m-xico · "Transparencia para el Pueblo" como órgano de transparencia (no de datos de particulares): gob.mx `<VERIFICACIÓN PARCIAL>`

**Argentina**

62. **Ley 25.326**, arts. 1, 2, 12, 29 y 31 — https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm
63. **Disposición 60-E/2016** (DNPDP, 16-11-2016): art. 1 (Anexos I y II, contratos modelo) y art. 3 (lista de países adecuados, **sin Venezuela**) — https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/267922/norma.htm
64. **Resolución AAIP 126/2024** (BO 24-05-2024, vigente 01-06-2024; graduación y tope acumulado de $50.000.000 ARS) — https://www.argentina.gob.ar/normativa/nacional/norma-399750/actualizacion
65. **Resolución AAIP 179/2025** (BO 30-09-2025; solo modifica el art. 5 inc. b — **no** actualizó montos) — https://www.argentina.gob.ar/normativa/nacional/norma-418053/texto
66. AAIP, estado del proyecto de ley (**Mensaje 87/2023**, no el 42/2023) — https://www.argentina.gob.ar/aaip/datospersonales/proyecto-ley-datos-personales
67. Proyectos de reforma 2026 (1751-D-2026 Yeza; 3397-D-2026 Rossi) — IAPP, Allende & Brea, diariojudicial.com, leydedatospersonales.tech `<VERIFICACIÓN PARCIAL>`

**Chile**

68. **Ley 21.719**, texto XML: art. 1, **art. 1° bis íntegro** y disposiciones transitorias **primera, tercera, cuarta y sexta** — https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=1209272 `<el XML se trunca antes de los arts. 33-40 sancionatorios>`
69. **BCN, Serie Informes N° 12-25 del 08-04-2025**, *"Descripción y síntesis de la ley N° 21.719"* (escala de sanciones de los arts. 33-40; Agencia de Protección de Datos Personales; Registro Nacional de Sanciones y Cumplimiento) — https://obtienearchivo.bcn.cl/obtienearchivo?id=repositorio/10221/37137/1/Informe_12_25_Ley_Datos_Personales_rev.pdf
70. **UTM septiembre 2026 = $71.721 CLP** — https://www.sii.cl/valores_y_fechas/utm/utm2026.htm
71. Proyecto de postergación ingresado al Senado el 1-09-2026 — https://www.carey.cl/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales · https://www.latercera.com/pulso/noticia/proteccion-de-datos-personales-gobierno-ingresa-proyecto-que-posterga-en-un-ano-entrada-en-vigencia-de-la-ley/

**California**

72. **Cal. Civ. Code § 1798.140** — definiciones (d)(1)(A)-(C) y (d)(2)-(4) de *business*, (ag)(1) y (ag)(2) de *service provider*, (j) de *contractor* — https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140
73. Cal. Civ. Code §§ **1798.100(d)**, **1798.150(a)(1)**, **1798.155(a)**, **1798.199.90**, **1798.199.95(d)** — leginfo.legislature.ca.gov
74. **Cal. Code Regs. tit. 11, div. 6** — §§ 7001 (definiciones de ADMT, *human involvement*, *significant decision*), 7051(a) (términos obligatorios del contrato de service provider), 7123 ss., 7150, 7155, 7200, 7220, 7222 — reproducción vía Cornell LII `<cppa.ca.gov inalcanzable>`
75. Cifras ajustadas vigentes: umbral **USD 26.625.000** y multas **USD 2.663 / 7.988**; brechas **USD 107–799** — CPPA / privacy.ca.gov · https://cppa.ca.gov/announcements/2024/20241217.html · https://www.clym.io/blog/ccpa-applicability-guide

**PCI DSS**

76. **PCI DSS v4.0.1** (junio 2024), texto del estándar: reqs. 6.2.1–6.2.3, 6.3.1–6.3.2, 6.4.3, 11.6.1, 12.8.1–12.8.5, 12.9.1–12.9.2; definición de TPSP; tabla de versiones; nota sobre la discrecionalidad de marcas y adquirentes — pcisecuritystandards.org
77. PCI SSC Document Library (confirma v4.0.1 como versión actual; **no existe v4.1 ni v5.0 de DSS** — la "v5.0" del roadmap es PTS HSM) — https://www.pcisecuritystandards.org/document_library/
78. PCI SSC blog, 20 de agosto de 2024: *"Of the 64 new requirements, 51 are future-dated and will be effective as of 31 March 2025"*
79. PCI SSC, comunicado del **30 de enero de 2025** (revisión de SAQ A: eliminación de 6.4.3, 11.6.1 y 12.3.1, nuevo criterio de elegibilidad, efecto 31-03-2025) y **FAQ 1588** (febrero 2025, dos vías para satisfacerlo) — https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a
80. **SAQ A** y **SAQ A-EP** — criterios de elegibilidad literales y la nota de que los reqs. 2, 6 y 8 aplican al servidor donde vive el mecanismo de redirección — https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A.pdf · https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A-EP.pdf · https://www.pcisecuritystandards.org/wp-content/uploads/2024/10/SAQs_for_PCI_DSS_v4.0.1_Bulletin.pdf `<los PDFs de v4.0.1 devolvieron 403; los literales citados son de la v4.0 de abril de 2022>`
81. Mastercard *Security Rules and Procedures — Merchant Edition* (SPME), ed. 3 de febrero de 2026 — existencia, título y fecha verificados; **tabla de *noncompliance assessments* no extraída (HTTP 403)**. Visa *AIS Program Guide*: **no público**. **⇒ cifras de multa `<SIN VERIFICAR>`, no usar**
82. Guías de apoyo sobre reqs. 12.8/12.9 y *shared responsibility* — https://www.securitymetrics.com/program-education/pci-dss-v4-faqs-for-service-providers · https://www.akamai.com/blog/security/pci-dss-v4-0-1-changes-qualify-saq-a

**Verificación local sobre el repositorio (§2.3)**

83. `worker/index.mjs` (56 líneas) y `wrangler.jsonc` del propio repositorio — se comprobó que el Worker **no accede a `request.headers` de entrada, ni a `request.cf`, ni a la IP**, y que no hay bloque `observability`. Verificación directa, reproducible con `cat worker/index.mjs`.
### Benchmark de consultoras (§3) — abiertas y verificadas

84. https://www.thoughtworks.com/about-us/privacy-policy
85. https://www.thoughtworks.com/about-us/privacy-policy/cookies-and-similar-technologies
86. https://university.globant.com/privacy-policy
87. https://www.bairesdev.com/terms-conditions/
88. https://www.bairesdev.com/privacy-policy/
89. https://www.endava.com/privacy-notice
90. https://www.endava.com/terms-and-conditions
91. https://www.endava.com/legal
92. https://es.softtek.co/politica-de-privacidad
93. https://www.coforge.com/privacy-statement
94. https://www.luxoft.com/terms-of-use
95. https://www.luxoft.com/online-privacy-policy-2022
96. https://academia.10pines.com/politicadeprivacidad
97. https://8thlight.com/terms-of-use
98. https://8thlight.com/privacy-policy
99. https://www.tribe.ai/terms-of-service
100. https://www.tribe.ai/privacy-policy
101. https://www.aimpointdigital.com/terms-conditions
102. https://www.aimpointdigital.com/privacy-policy
103. https://www.humanlayerlab.com/dpa
104. https://www.humanlayerlab.com/privacy
105. https://www.humanlayerlab.com/terms
106. https://www.artefact.com/privacy-policy/
107. https://trust3.ai/dpa/

### Benchmark — verificación parcial o no verificada

108. https://www.endava.com/hubfs/Legal/Supplier%20Data%20Processing%20Agreement.pdf — `<VERIFICACIÓN PARCIAL: PDF por conversión automática; citas aproximadas>`
109. https://www.globant.com/privacy-policy · /terms-and-conditions · /enterprise-ai/terms-of-use — `<SIN VERIFICAR: HTTP 403>`
110. https://www.nearsure.com/privacy-policy — `<SIN VERIFICAR: DNS no resuelve>`
111. https://www.encora.com/privacy-policy — **301 a coforge.com** (Encora absorbida por Coforge)
112. https://www.endava.com/hubfs/Legal/Website-Supplier-General-Terms-Conditions-En.20.11.2025.pdf — `<SIN VERIFICAR: PDF no decodificable>`
113. https://dxc.com/content/dam/dxc/projects/dxc-com/us/pdfs/contact-us/supplier-resources/Data-Privacy-Supplement.pdf — `<SIN VERIFICAR: PDF no decodificable; solo se extrajeron sus enlaces a las SCC de la UE y al IDTA del ICO>`
114. https://www.thoughtworks.com/about-us/terms-of-use — `<SIN VERIFICAR: 404, no se localizaron términos de uso del sitio>`
115. `/.well-known/security.txt` en thoughtworks.com, endava.com, 8thlight.com, coforge.com, humanlayerlab.com → 404; luxoft.com → 403

---

## Advertencia

Este documento es **investigación**, no asesoramiento jurídico. Recoge lo verificado el
2026-09-16 y marca explícitamente lo que no pudo verificarse. Antes de firmar cualquiera de
los documentos propuestos con una entidad regulada por SUDEBAN, debe revisarlos un abogado
venezolano. Los hallazgos marcados `<SIN VERIFICAR>` no deben trasladarse a un documento
público sin confirmación previa contra la fuente primaria.

**Asimetría de verificación entre secciones.** La §2 (marcos extraterritoriales) se apoya en
**texto literal extraído de fuentes primarias**: EUR-Lex, legislation.gov.uk,
leginfo.legislature.ca.gov, Planalto, diputados.gob.mx, InfoLeg, el gestor normativo de
Función Pública, LeyChile y el PCI SSC. La §1 (Venezuela) está peor servida: las gacetas
oficiales venezolanas **no son accesibles en línea** y el servidor del TSJ presenta certificado
autofirmado, así que varias afirmaciones descansan en fuentes secundarias concordantes (DLA
Piper, firmas legales, ONGs) y quedan marcadas como tales. **Es una inversión desafortunada
del riesgo: lo mejor verificado es lo que menos aplica, y lo que más aplica es lo peor
verificado.** Los dos huecos con mayor impacto práctico son el articulado íntegro de la
**Resolución 001-21 de SUDEBAN** (Gaceta Oficial N° 42.151) y la enumeración literal de los
nueve principios de la **Sentencia 1318/2011** de la Sala Constitucional. Conseguir esos dos
textos —en físico si hace falta— es la siguiente tarea de investigación.

**Resumen de lo verificado por fuente primaria en la §2:** RGPD arts. 3, 6, 10, 22, 27, 28,
30, 33, 37, 44, 83 y recitales 23, 24, 49; EDPB Guidelines 3/2018 v2.1; TJUE C-582/14
*Breyer*; Decisiones 2021/914 y 2023/1795; AI Act arts. 2, 3, 5, 6, 25, 50, 51, 53, 99, 113,
Anexo III.5(b) y recitales 42 y 58; Reglamento (UE) 2026/1744; UK GDPR arts. 3 y 27, DPA 2018
s.157 y DUAA 2025; LGPD arts. 3 y 52; Ley 1581 arts. 2, 19, 23, 25; LFPDPPP vigente arts. 1,
2, 35, 59–64; Ley 25.326 arts. 1, 2, 12, 31 y Disposición 60-E/2016; Ley 21.719 art. 1° bis y
transitorios; CCPA §§ 1798.140, 1798.150, 1798.155; PCI DSS v4.0.1 reqs. 6, 11.6.1, 12.8, 12.9
y criterios de SAQ A/A-EP; DPA de Cloudflare v6.4; y `worker/index.mjs` del propio repositorio.
