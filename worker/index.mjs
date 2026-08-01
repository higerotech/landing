/* ── Único código que corre en el borde ──────────────────────────────────
   ADR-0006 eligió «sitio estático puro, sin código de Worker», y dejó escrito
   que si algún día hiciera falta lógica aquí entraría un `main`. Este es ese
   día, y conviene decir por qué no había alternativa.

   Tres assets de marca —el isotipo en carbón, la tarjeta social y el logotipo—
   tienen que poder incrustarse desde otros orígenes. Lo que lo impide es
   `Cross-Origin-Resource-Policy: same-origin`, no `Referrer-Policy`: esa
   segunda solo recorta la cabecera `Referer` que envía el navegador y no
   bloquea nada.

   `cloudflare/_headers` no puede expresarlo, y está MEDIDO, no supuesto:
   una regla específica **añade** en vez de sustituir, así que el asset salía
   con dos `Cross-Origin-Resource-Policy` —`same-origin` y `cross-origin`—.
   Prefijar la cabecera con `!` para borrarla tampoco funciona: se probó con
   `wrangler dev` y las dos seguían ahí. Un valor duplicado no es «la última
   gana»: el navegador no reconoce el resultado combinado, y jugársela a que
   un valor inválido se interprete como permisivo es la clase de cosa que
   funciona hasta que deja de hacerlo.

   `Headers.set()` sí sustituye. De ahí este archivo.

   Alcance mínimo a propósito: `run_worker_first` en `wrangler.jsonc` enumera
   las tres rutas, y **esa lista es la allowlist**. Todo lo demás no pasa por
   aquí: lo sirve el Asset Worker directamente, sin ejecutar una línea de este
   código. Por eso el script no vuelve a comprobar la ruta — hacerlo obligaría
   a mantener la misma lista en dos sitios, que es justo la deriva que U12
   vigila. */

export default {
  async fetch (request, env) {
    const respuesta = await env.ASSETS.fetch(request)

    /* Se copian las cabeceras y se sustituyen las dos que cambian; el resto
       —CSP, COOP, COEP, `Cache-Control`, `Content-Type`— viaja intacto. */
    const cabeceras = new Headers(respuesta.headers)
    cabeceras.set('Cross-Origin-Resource-Policy', 'cross-origin')

    /* `Access-Control-Allow-Origin` no hace falta para un `<img>` —eso lo
       resuelve CORP— pero sí para `fetch()` y para dibujar en un `<canvas>`
       sin contaminarlo. Son imágenes públicas de marca: no hay nada que
       proteger detrás de un origen concreto. */
    cabeceras.set('Access-Control-Allow-Origin', '*')

    return new Response(respuesta.body, {
      status: respuesta.status,
      statusText: respuesta.statusText,
      headers: cabeceras
    })
  }
}
