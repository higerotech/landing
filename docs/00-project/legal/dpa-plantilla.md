# Acuerdo de Tratamiento de Datos (DPA) — plantilla firmable

* **Estado:** **borrador — no firmar sin revisión de un abogado venezolano**
* **Fecha:** 2026-09-16
* **Decisores:** Jeremi Alcalá
* **Fase AI-DLC:** 00-project
* **Versión:** 0.1.0
* **Documento:** D4 de la investigación de marco legal (`investigacion-marco-legal.md`, §5.1)
* **Rol que documenta:** Higerotech como **encargado del tratamiento**

---

## Cómo se usa este documento (nota interna, no forma parte del acuerdo)

Esto **no es una política publicable en la web**: es un anexo contractual que se firma con cada
cliente por cuya cuenta Higerotech trate datos personales. Se activa en un escenario concreto y
solo en ese: cuando Higerotech **opera** un sistema —SaaS, soporte con acceso a producción,
mantenimiento sobre datos reales— y por tanto toca datos de los clientes finales del cliente.

Cuando Higerotech solo **construye y entrega**, este acuerdo no aplica: lo que hace falta es el
acta de entrega y la cláusula de corte de responsabilidad del contrato marco. La frontera entre
los dos escenarios es la fecha del acta, y por eso el acta importa tanto como este documento.

**Por qué ofrecer el propio en vez de firmar el del cliente.** Un banco tiene un DPA redactado
para proveedores grandes: auditorías a voluntad, responsabilidad sin tope, plazos de
notificación que solo puede cumplir quien tenga guardia 24/7. Llegar con este documento cambia
la conversación de «firma» a «negociemos». Es la diferencia más barata que existe entre las dos.

**Lo que hay que rellenar antes de enviarlo a alguien:** todo lo marcado `<TODO: …>`. Son
decisiones del owner, no huecos de redacción, y están enumeradas en §5.5 de la investigación.

**Advertencia que no se puede saltar:** este borrador está construido sobre investigación
documentada, no sobre asesoramiento jurídico. **Un abogado venezolano debe revisarlo antes de
firmarlo con una entidad regulada por SUDEBAN.** El motivo no es formal: parte del articulado de
la Resolución 001-21 en materia de tercerización no pudo verificarse contra la Gaceta Oficial
durante la investigación y está marcado como no verificado.

---

## Marco normativo de este acuerdo

Conviene decirlo de entrada, porque cambia cómo se lee todo lo demás: **en Venezuela no existe
una ley general de protección de datos personales**, ni autoridad de control, ni registro de
bases de datos, ni deber legal de notificar brechas. Lo que hay es el derecho constitucional al
habeas data (arts. 28 y 60 de la Constitución) desarrollado por jurisprudencia vinculante de la
Sala Constitucional del Tribunal Supremo de Justicia.

De ahí se sigue algo práctico: **las obligaciones de este acuerdo son contractuales antes que
legales.** No las impone un regulador — las impone este documento. Eso no las debilita; en la
práctica las hace más exigibles, porque un incumplimiento es un incumplimiento de contrato con
consecuencias inmediatas y no un expediente administrativo que quizá nunca se abra.

Tres cuerpos normativos sí muerden, y el acuerdo está escrito contra ellos:

1. **La Ley Especial contra los Delitos Informáticos** (G.O. 37.313, 30-oct-2001), cuyos
   artículos 20 y 22 castigan con **prisión de dos a seis años** el apoderamiento y la
   revelación indebida de data personal. La cláusula 7 de este acuerdo existe por eso, y no por
   pulcritud metodológica: es el escudo de las personas que tocan los datos.
2. **La normativa sectorial del cliente** — secreto bancario y obligaciones SUDEBAN si el
   cliente es una entidad regulada. Higerotech no es sujeto obligado de esas normas; el cliente
   sí, y este acuerdo está diseñado para que pueda demostrar su cumplimiento.
3. **El RGPD europeo**, cuando el cliente trate datos de personas en la UE. En ese caso este
   acuerdo hace las veces de contrato del art. 28.3 y su articulado sigue esa estructura, que
   además es la que cualquier comprador serio reconoce.

---

## Partes

**El Encargado:** `<TODO: razón social exacta>`, RIF `<TODO>`, con domicilio en `<TODO>`,
inscrita en `<TODO: registro mercantil, tomo y número>`, en adelante «**Higerotech**».

**El Responsable:** `<TODO: razón social del cliente>`, RIF `<TODO>`, con domicilio en `<TODO>`,
en adelante «**el Cliente**».

Ambas partes reconocen que, respecto de los Datos Personales objeto de este acuerdo, **el
Cliente es el responsable del tratamiento y Higerotech es el encargado**. Si el Cliente actúa a
su vez como encargado de un tercero, Higerotech es subencargado y este acuerdo se interpreta en
consecuencia.

---

## 1. Objeto, roles y duración

1.1. Este acuerdo regula el tratamiento de Datos Personales que Higerotech realice **por cuenta
y bajo instrucciones del Cliente** en la prestación de los servicios descritos en el contrato
principal y, en particular, en los sistemas que Higerotech opere para el Cliente.

1.2. El Cliente determina las finalidades y los medios esenciales del tratamiento. Higerotech no
trata los Datos Personales para finalidades propias.

1.3. Este acuerdo entra en vigor en la fecha de su firma y permanece vigente mientras Higerotech
trate Datos Personales por cuenta del Cliente. Las obligaciones de confidencialidad (cláusula 4),
la prohibición de uso secundario (cláusula 6) y las de devolución y borrado (cláusula 13)
**sobreviven a la terminación**.

1.4. **Delimitación expresa.** Este acuerdo no cubre:

- los datos que Higerotech trate como responsable propio (su sitio web y la correspondencia de
  prospectos: eso lo cubre su política de privacidad);
- los sistemas que Higerotech haya **entregado y no opere**, a partir de la fecha del acta de
  entrega y aceptación, momento en el cual el Cliente asume la operación, la configuración, las
  copias de respaldo y las decisiones de retención.

---

## 2. Descripción del tratamiento

Las categorías de datos, de interesados, las finalidades, la duración y las ubicaciones se
describen en el **Anexo I**, que se completa por proyecto y forma parte de este acuerdo. Si un
proyecto no tiene su Anexo I completado, **no hay instrucción documentada y no debe tratarse
ningún dato productivo**.

---

## 3. Instrucciones documentadas y límites

3.1. Higerotech trata los Datos Personales únicamente conforme a las instrucciones documentadas
del Cliente, incluidas las contenidas en el Anexo I, en el contrato principal y en las órdenes
de servicio.

3.2. Higerotech informará al Cliente si, en su opinión, una instrucción infringe la normativa
aplicable, y podrá suspender su ejecución hasta que el Cliente la confirme o la modifique.

3.3. Una instrucción que amplíe las categorías de datos, las finalidades o las personas con
acceso **requiere actualización escrita del Anexo I**. No se acepta por correo informal: es
justamente el punto donde el alcance se desborda sin que nadie lo decida.

---

## 4. Confidencialidad del personal

4.1. Higerotech garantiza que toda persona con acceso a los Datos Personales está sujeta a
obligación de confidencialidad, con la misma extensión que este acuerdo y con supervivencia tras
el fin de su relación con Higerotech.

4.2. El acceso se concede según el principio de **mínimo privilegio y necesidad de conocer**, y
se revoca de forma documentada al cesar la necesidad.

4.3. Cuando el Cliente sea una entidad sujeta a secreto bancario, Higerotech hará extensiva a su
personal esa obligación en los mismos términos que exija la normativa del Cliente.

---

## 5. Medidas técnicas y organizativas

Las medidas se enumeran en el **Anexo II**. Se describen en términos concretos y verificables, y
**no se declara ninguna certificación que Higerotech no posea**. Higerotech no está certificada
en ISO 27001, SOC 2 ni PCI DSS, y no lo declarará mientras no lo esté.

---

## 6. Prohibición de uso secundario y de entrenamiento de modelos

6.1. Higerotech **no utilizará los Datos Personales del Cliente para entrenar, afinar,
evaluar ni desarrollar modelos de inteligencia artificial o aprendizaje automático**, propios o
de terceros.

6.2. Esta prohibición se extiende a los datos **en cualquier forma derivada, incluidos conjuntos
anonimizados, seudonimizados, agregados, sintéticos derivados de datos reales, y *embeddings* o
representaciones vectoriales**. El cierre importa: sin él, «anonimizamos y entrenamos» sería
compatible con la letra de la cláusula, y es exactamente lo que la cláusula quiere impedir.

6.3. Cuando Higerotech emplee herramientas de terceros con capacidades de IA en la prestación de
los servicios, solo usará aquellas cuyas condiciones contractuales excluyan el uso de las
entradas para entrenamiento, y las declarará como subencargados conforme a la cláusula 8.

6.4. Higerotech no monetizará, cederá ni pondrá a disposición de terceros los Datos Personales,
ni elaborará con ellos estadísticas o productos propios.

---

## 7. Prohibición de datos productivos fuera de producción

7.1. Está **prohibido** copiar, exportar, transmitir o replicar Datos Personales productivos del
Cliente a: entornos de desarrollo, prueba, integración o demostración; equipos personales o no
gestionados; servicios de almacenamiento, mensajería o productividad no autorizados; y
herramientas de inteligencia artificial de terceros.

7.2. Los entornos no productivos se alimentan con **datos sintéticos o anonimizados de forma
irreversible**. Cuando un diagnóstico exija datos reales, se hará **sobre el entorno productivo
del Cliente**, con acceso nominal, por tiempo limitado y con registro de la actividad.

7.3. Esta cláusula no es una buena práctica de ingeniería: es la que previene un **delito
penal**. Los artículos 20 y 22 de la Ley Especial contra los Delitos Informáticos castigan el
apoderamiento y la revelación indebida de data personal con prisión de dos a seis años, y la
conducta típica es precisamente la que aquí se prohíbe — copiar datos productivos a un portátil
o pegarlos en una herramienta ajena. Protege al Cliente, y protege a quien tenga las credenciales.

---

## 8. Subencargados

8.1. El Cliente otorga a Higerotech **autorización general** para recurrir a subencargados, con
las condiciones de esta cláusula.

8.2. Higerotech mantiene una **lista nominal y pública** de subencargados, con la finalidad de
cada uno y su ubicación. A la fecha de este acuerdo incluye, como mínimo:

| Subencargado | Finalidad | Ubicación |
|---|---|---|
| Cloudflare, Inc. | Entrega del sitio en el borde e infraestructura de despliegue | Red global |
| `<TODO: proveedor de correo>` | Correo corporativo y correspondencia | `<TODO>` |
| `<TODO: proveedores de modelos de IA en uso>` | Asistencia al desarrollo | `<TODO>` |

8.3. Higerotech notificará al Cliente la incorporación de un nuevo subencargado con **catorce
(14) días** de preaviso. El Cliente podrá **objetar de forma razonada dentro de los siete (7)
días** siguientes; si objeta, las partes buscarán una alternativa de buena fe, y si no la hay el
Cliente podrá resolver la parte del servicio afectada sin penalización.

8.4. Higerotech impone a cada subencargado obligaciones de protección de datos **no menos
exigentes** que las de este acuerdo, y responde frente al Cliente de su incumplimiento.

---

## 9. Transferencias internacionales

9.1. El Cliente reconoce que la prestación del servicio implica infraestructura de proveedores
con presencia global, y que por tanto puede haber tratamiento fuera del territorio venezolano.
El Anexo I identifica las ubicaciones de cada proyecto.

9.2. Cuando el tratamiento afecte a datos de personas en la Unión Europea o el Reino Unido, las
transferencias se amparan en las **Cláusulas Contractuales Tipo** de la Comisión Europea y, en su
caso, en el *UK International Data Transfer Addendum*, incorporadas a través de los acuerdos con
los subencargados correspondientes.

9.3. Si el Cliente está sujeto a una obligación sectorial de **localización de datos** en
Venezuela, debe declararlo en el Anexo I **antes** del inicio del tratamiento: condiciona la
arquitectura, y descubrirlo después es rehacer el proyecto.
`<TODO: confirmar con abogado el alcance exacto de la obligación de localización para entidades
supervisadas por SUDEBAN — la investigación no pudo verificar ese articulado contra la Gaceta
Oficial.>`

---

## 10. Derechos de los interesados

10.1. Higerotech no responde directamente a los interesados: **traslada al Cliente** sin demora
cualquier solicitud que reciba, incluidas las de habeas data del art. 28 de la Constitución.

10.2. Higerotech asiste al Cliente en la atención de esas solicitudes —acceso, rectificación,
supresión, oposición, portabilidad— en la medida en que solo pueda hacerse desde los sistemas
que Higerotech opera.

10.3. La asistencia que exceda de lo razonable y recurrente **se factura** conforme a las tarifas
del contrato principal. Se dice aquí y no en una discusión posterior: una empresa pequeña no
puede absorber un volumen de solicitudes indeterminado de forma gratuita.

---

## 11. Notificación de incidentes

11.1. Higerotech notificará al Cliente **sin demora indebida y en todo caso dentro de las
setenta y dos (72) horas** siguientes al momento en que tenga conocimiento de una violación de
seguridad que afecte Datos Personales tratados por cuenta del Cliente.

11.2. La notificación incluirá, con la información disponible en ese momento: naturaleza del
incidente, categorías y volumen aproximado de datos e interesados afectados, consecuencias
probables, medidas adoptadas y contacto para el seguimiento. La información incompleta **no
justifica retrasar** la notificación inicial.

11.3. **La notificación al regulador y a los interesados, cuando proceda, corresponde al
Cliente**, que es el responsable. Higerotech le presta la asistencia y la información que
necesite para hacerlo.

11.4. Higerotech no hará comunicaciones públicas sobre un incidente que afecte al Cliente sin su
consentimiento previo por escrito, salvo obligación legal.

---

## 12. Auditoría

12.1. Higerotech pone a disposición del Cliente la información razonablemente necesaria para
demostrar el cumplimiento de este acuerdo.

12.2. El Cliente podrá auditar ese cumplimiento **una (1) vez por año calendario**, con
**treinta (30) días** de preaviso, en horario laboral, sin interrumpir la operación, bajo
confidencialidad y **a su costa**.

12.3. Higerotech podrá satisfacer una solicitud de auditoría entregando un informe de evaluación
vigente que cubra el alcance solicitado.

12.4. Se pactan auditorías adicionales sin límite de frecuencia cuando las exija un requerimiento
de una autoridad supervisora del Cliente o un incidente de seguridad confirmado. Fuera de esos
dos casos, el límite anual es una condición de este acuerdo: sin él, un cliente regulado puede
consumir la capacidad entera de un proveedor pequeño con auditorías sucesivas.

---

## 13. Devolución y borrado

13.1. Al terminar la prestación, y a elección del Cliente, Higerotech **devolverá o suprimirá**
los Datos Personales y sus copias en un plazo máximo de **treinta (30) días** desde la
instrucción del Cliente.

13.2. Higerotech certificará por escrito la supresión cuando el Cliente lo solicite.

13.3. **Excepciones declaradas de antemano**, porque prometer supresión total sin excepciones es
una promesa que no se puede cumplir:

- copias en respaldos cifrados con rotación automática, que se suprimen al vencer su ciclo y no
  se restauran para otra finalidad;
- datos cuya conservación imponga una obligación legal, contable o fiscal a Higerotech;
- registros de auditoría cuya inmutabilidad exija la normativa del propio Cliente — un registro
  que el Cliente está obligado a conservar no puede borrarse porque el contrato termine.

---

## 14. Responsabilidad

14.1. La responsabilidad agregada de Higerotech derivada de este acuerdo y del contrato
principal, por cualquier causa, **no excederá de `<TODO: tope — la referencia del benchmark es
el total de honorarios efectivamente pagados por el Cliente en los doce (12) meses anteriores a
la reclamación>`**.

14.2. **Este tope cubre también las obligaciones de este acuerdo.** Se dice expresamente porque
el error habitual es poner el tope en el contrato marco y dejar el DPA sin tope, con lo que la
vía de protección de datos se convierte en la puerta por la que entra una responsabilidad
ilimitada.

14.3. Ninguna de las partes responde de daños indirectos, lucro cesante ni pérdida de
oportunidad. Las limitaciones de esta cláusula no aplican al dolo.

14.4. `<TODO: si se firma un contrato marco (D3), esta cláusula pasa a remitir a su tope en vez
de fijar uno propio. Mientras el marco no exista, el DPA tiene que traer su tope: un anexo sin
tope y sin contrato al que remitir es un anexo sin tope.>`

---

## 15. Disposiciones finales

15.1. **Prelación.** En caso de contradicción entre este acuerdo y el contrato principal en
materia de protección de datos, **prevalece este acuerdo**.

15.2. **Datos de menores.** Los sistemas objeto de este acuerdo no están destinados a menores de
edad. El Cliente se obliga a no tratar datos de niños, niñas o adolescentes a través de ellos sin
la base legal y las salvaguardas exigidas por la Ley Orgánica para la Protección de Niños, Niñas
y Adolescentes, y a declararlo en el Anexo I si tal tratamiento fuera necesario.

15.3. **Aceptación electrónica.** Las partes reconocen plena validez y eficacia probatoria a la
firma y aceptación de este acuerdo por medios electrónicos, conforme a la Ley sobre Mensajes de
Datos y Firmas Electrónicas.

15.4. **Ley aplicable y resolución de disputas.** Este acuerdo se rige por las leyes de la
República Bolivariana de Venezuela. Las controversias que no se resuelvan de buena fe en treinta
(30) días se someterán a **arbitraje** conforme a `<TODO: reglamento e institución arbitral —
p. ej. el Centro de Arbitraje de la Cámara de Caracas>`, con sede en `<TODO>`, en idioma
castellano y con `<TODO: uno o tres>` árbitro(s).
`<TODO: decisión pendiente del owner sobre el coste. El arbitraje es más negociable frente a un
cliente grande o extranjero que los tribunales de la sede, pero cuesta dinero que una empresa de
una persona puede no tener. Si el cliente es venezolano y el contrato pequeño, los tribunales
ordinarios de la sede pueden ser la opción sensata.>`

15.5. **Versión prevalente.** La versión en castellano de este acuerdo prevalece sobre cualquier
traducción.

---

## Anexo I — Descripción del tratamiento

*Se completa por proyecto. Sin este anexo completado no hay instrucción documentada (cláusula 3.3).*

| Campo | Contenido |
|---|---|
| Proyecto / orden de servicio | `<TODO>` |
| Modalidad | `<TODO: Higerotech opera / Higerotech entrega y no opera>` |
| Finalidad del tratamiento | `<TODO>` |
| Categorías de interesados | `<TODO: p. ej. clientes finales del Cliente, empleados del Cliente>` |
| Categorías de datos personales | `<TODO>` |
| Categorías especiales o datos financieros | `<TODO: declarar expresamente si hay datos sujetos a secreto bancario>` |
| Datos de menores | `<TODO: sí / no. Si sí, base legal y salvaguardas>` |
| Volumen aproximado | `<TODO>` |
| Duración del tratamiento | `<TODO>` |
| Ubicaciones de tratamiento | `<TODO>` |
| Obligación de localización en Venezuela | `<TODO: sí / no>` |
| Subencargados específicos del proyecto | `<TODO>` |
| Personas de Higerotech con acceso | `<TODO: nominal>` |
| Fecha del acta de entrega, si aplica | `<TODO>` |

---

## Anexo II — Medidas técnicas y organizativas

*Concretas y verificables. Lo que no se pueda demostrar, no se escribe.*

**Control de acceso**
- Acceso nominal e individual a los entornos del Cliente; sin credenciales compartidas.
- Mínimo privilegio, con revisión `<TODO: periodicidad>` y revocación documentada al cesar la necesidad.
- Segundo factor de autenticación en todo acceso a entornos productivos.

**Cifrado**
- Cifrado en tránsito con TLS en todas las conexiones.
- Cifrado en reposo conforme a las capacidades del proveedor de infraestructura del proyecto,
  declaradas en el Anexo I.

**Separación de entornos**
- Los entornos no productivos no contienen datos personales productivos (cláusula 7).
- Datos sintéticos o anonimizados de forma irreversible para desarrollo y prueba.

**Trazabilidad**
- Registro de accesos y operaciones sobre datos personales en los sistemas operados, conforme a
  lo pactado en el Anexo I.
- Cuando el Cliente esté sujeto a exigencias de auditoría inmutable, los registros se diseñan
  para satisfacerlas y su conservación se rige por la normativa del Cliente.

**Desarrollo**
- Revisión de cambios antes de su promoción a producción.
- Gestión de secretos fuera del código fuente.
- `<TODO: declarar aquí las prácticas que Higerotech pueda demostrar con evidencia (pruebas
  automatizadas, análisis de dependencias, escaneo dinámico). No declarar las que no tenga
  evidencia ejecutable: este anexo es auditable y una afirmación sin respaldo es peor que una
  omisión.>`

**Inteligencia artificial**
- Herramientas de IA usadas en el desarrollo con revisión humana obligatoria de sus salidas.
- Exclusión contractual del uso de entradas para entrenamiento en las herramientas empleadas
  (cláusula 6.3).
- Prohibición de introducir datos productivos del Cliente en herramientas de IA (cláusula 7.1).

**Continuidad**
- `<TODO: describir respaldos, su periodicidad y el objetivo de recuperación, o declarar que la
  continuidad es responsabilidad del Cliente sobre su propia infraestructura. Las dos respuestas
  son legítimas; la que no vale es dejarlo ambiguo.>`

**Personal**
- Obligación de confidencialidad con supervivencia tras el fin de la relación.
- `<TODO: formación o instrucción documentada en tratamiento de datos, si se implanta.>`

---

## Firmas

| | El Cliente | Higerotech |
|---|---|---|
| Nombre | `<TODO>` | `<TODO>` |
| Cargo | `<TODO>` | `<TODO>` |
| Fecha | `<TODO>` | `<TODO>` |
| Firma | | |
