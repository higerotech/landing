/* ── Comportamiento del sitio ─────────────────────────────────────────────
   Todo el JavaScript de `index.html`, extraído a un archivo propio el
   2026-09-16. El porqué está en ADR-0007; en dos líneas: con el JS fuera del
   HTML la CSP ya no necesita `'unsafe-inline'` en `script-src`, que era la
   mitad de la deuda T4 que ADR-0003 aceptó a cambio del archivo único.

   Sigue sin haber build: este archivo se sirve tal cual, y el CSS sigue
   dentro de `index.html` —por eso `style-src` conserva `'unsafe-inline'`—.

   Dos cosas que hay que saber antes de tocarlo:

   1. **Se carga al final del `<body>`, no con `defer`.** El script
      desreferencia nodos en el nivel superior (`getElementById('nav-toggle')`
      y compañía), así que necesita el DOM ya parseado. El `<link rel=preload>`
      del `<head>` es lo que evita que esa posición cueste un viaje extra: la
      descarga arranca con el parseo y no al terminarlo. U2.6 comprueba que el
      `preload` y el `src` sigan apuntando al mismo archivo.

   2. **No se cachea como el resto de `/assets/`.** Ese directorio se sirve
      `immutable` a 30 días, que para este archivo sería una trampa: el HTML se
      revalida siempre y el JS se quedaría congelado con la página nueva. En
      nginx tiene su propio `location =` con la misma política que el HTML; en
      el Worker la comparte porque `cloudflare/_headers` no fija `Cache-Control`
      para ninguno de los dos. Si algún día se renombra, hay que mover también
      esa regla.

   Las pruebas unitarias ejecutan ESTE archivo: el arnés lo inserta en el
   `index.html` real donde está su `<script src>`. Ver
   `docs/04-testing/unit-tests.md`. */

/* ── Contacto ─────────────────────────────────────────────────────
   Número de WhatsApp en formato internacional, **solo dígitos**: `wa.me`
   no admite `+`, espacios ni guiones. Vacío ⇒ el botón no se muestra,
   preferible a publicar un enlace muerto. La prueba U8.3 lo verifica. */
const CONTACT = { whatsapp: '13235543854' };

(function initWhatsApp() {
  const cta = document.getElementById('wa-cta');
  if (!cta || !CONTACT.whatsapp) return;
  cta.href = 'https://wa.me/' + CONTACT.whatsapp;
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  cta.hidden = false;
})();

/* ── Menú móvil ───────────────────────────────────────────────────
   Antes .nav-links se ocultaba en ≤980px sin reemplazo y las cuatro
   secciones quedaban inalcanzables desde el móvil. */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

function syncToggleLabel() {
  const abierto = navToggle.getAttribute('aria-expanded') === 'true';
  const attr = (abierto ? 'data-label-close' : 'data-label-open') +
               (currentLang === 'en' ? '-en' : '');
  navToggle.setAttribute('aria-label', navToggle.getAttribute(attr));
}

function setMenu(abierto) {
  navLinks.classList.toggle('open', abierto);
  navToggle.setAttribute('aria-expanded', String(abierto));
  syncToggleLabel();
}

navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    setMenu(false);
    navToggle.focus();
  }
});
// Al volver a escritorio el panel no debe quedar en estado abierto
const mqEscritorio = matchMedia('(min-width: 981px)');
const alCambiarAncho = e => { if (e.matches) setMenu(false); };
if (mqEscritorio.addEventListener) mqEscritorio.addEventListener('change', alCambiarAncho);
else if (mqEscritorio.addListener) mqEscritorio.addListener(alCambiarAncho);

/* ── Idioma ───────────────────────────────────────────────────── */
const IDIOMAS = ['es', 'en'];
let currentLang = 'es';

function setLang(lang) {
  if (IDIOMAS.indexOf(lang) === -1) lang = 'es';
  currentLang = lang;
  document.documentElement.lang = lang;

  const btnEs = document.getElementById('btn-es');
  const btnEn = document.getElementById('btn-en');
  btnEs.classList.toggle('active', lang === 'es');
  btnEn.classList.toggle('active', lang === 'en');
  btnEs.setAttribute('aria-pressed', String(lang === 'es'));
  btnEn.setAttribute('aria-pressed', String(lang === 'en'));

  /* La NodeList es estática. Si algún día un [data-es] quedara anidado
     dentro de otro, reescribir el externo desconectaría al interno y su
     asignación se perdería en silencio; isConnected lo evita. */
  document.querySelectorAll('[data-es][data-en]').forEach(el => {
    if (!el.isConnected) return;
    el.innerHTML = el.getAttribute('data-' + lang);
  });

  syncToggleLabel();
  try { localStorage.setItem('lang', lang); } catch (e) { /* modo privado */ }
}

// Prioridad: ?lang= (compartible e indexable) > preferencia guardada > es
function idiomaInicial() {
  const q = new URLSearchParams(location.search).get('lang');
  if (IDIOMAS.indexOf(q) !== -1) return q;
  try {
    const guardado = localStorage.getItem('lang');
    if (IDIOMAS.indexOf(guardado) !== -1) return guardado;
  } catch (e) { /* localStorage bloqueado */ }
  return 'es';
}

document.getElementById('btn-es').addEventListener('click', () => setLang('es'));
document.getElementById('btn-en').addEventListener('click', () => setLang('en'));

/* ── Scroll reveal ────────────────────────────────────────────────
   Con .reveal en opacity:0, si el observer no existe el contenido nunca
   aparecería. El <noscript> del head cubre el caso de JS deshabilitado. */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
}

document.getElementById('year').textContent = new Date().getFullYear();

setLang(idiomaInicial());
