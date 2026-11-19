// Agenda de Clubes: lee data/clubes.json y arma la portada de escudos y la página de cada club.

const TZ = 'America/Argentina/Buenos_Aires';
const $contenido = document.getElementById('contenido');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let datos = null;
let club = null; // club que se está mirando

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const partes = (iso, o) => Object.fromEntries(new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...o }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
const hora = (iso) => { const p = partes(iso, { hour: '2-digit', minute: '2-digit', hour12: false }); return `${p.hour}:${p.minute}`; };
const sinPunto = (s) => (s || '').replace('.', '');
function fechaBreve(iso) {
  if (!iso) return 'A confirmar';
  const p = partes(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${sinPunto(p.weekday)} ${p.day} ${sinPunto(p.month)}`;
}
const dos = (n) => String(n).padStart(2, '0');
const largo = (t) => Math.max(5, ...String(t).split(/\s+/).map((w) => w.length));
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const escudo = (c, clase = '') => `<img class="escudo ${clase}" src="${esc(c.escudo)}" alt="" loading="lazy" />`;

function resultado(p) {
  if (!p.jugado || p.gl == null || p.gv == null) return null;
  const a = p.esLocal ? p.gl : p.gv, b = p.esLocal ? p.gv : p.gl;
  return a > b ? 'G' : a < b ? 'P' : 'E';
}
const rival = (p) => (p.esLocal ? p.visitante : p.local);
const marcadorPropio = (p) => `${p.esLocal ? p.gl : p.gv}-${p.esLocal ? p.gv : p.gl}`;
const PALABRA = { G: 'Ganó', E: 'Empató', P: 'Perdió' };
const COLOR = { G: 'var(--gano)', E: 'var(--empato)', P: 'var(--perdio)' };

const jugados = (sec) => sec.partidos.filter((p) => p.jugado).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
function proximos(sec) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return sec.partidos.filter((p) => !p.jugado && p.estado !== 'Suspendido' && (!p.fecha || new Date(p.fecha) >= hoy));
}
const filaClub = (sec) => sec.tabla?.filas.find((f) => f.esClub) || null;
const filaDe = (sec, equipo) => sec.tabla?.filas.find((f) => norm(f.equipo) === norm(equipo)) || null;

function cuando(iso) {
  const dia = (d) => partes(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const a = dia(new Date()), b = dia(iso);
  const dias = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 864e5);
  return dias <= 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`;
}

function situacion(sec) {
  const f = filaClub(sec);
  if (!f) return '';
  const filas = sec.tabla.filas;
  if (f.pos === 1) return `Primero de la fase regular con ${f.pts} puntos.`;
  const dif = filas[0].pts - f.pts;
  return `Puesto ${f.pos} de ${filas.length} en la fase regular, a ${dif} ${dif === 1 ? 'punto' : 'puntos'} del primero.`;
}

// ---------- Componentes (los mismos que la página de Quilmes, adaptados al rugby) ----------
function lineas(sec) {
  const lista = jugados(sec).slice().reverse();
  if (lista.length < 2) return '<p class="vacio">Faltan partidos para armar el gráfico.</p>';
  const W = 320, H = 150, der = 26, arriba = 8;
  const acum = { G: [0], E: [0], P: [0] };
  for (const p of lista) { const r = resultado(p); for (const k of ['G', 'E', 'P']) acum[k].push(acum[k].at(-1) + (k === r ? 1 : 0)); }
  const tipos = acum.E.at(-1) ? ['G', 'E', 'P'] : ['G', 'P'];
  const max = Math.max(...tipos.map((k) => acum[k].at(-1)), 1);
  const n = lista.length;
  const x = (i) => (i / n) * (W - der);
  const y = (v) => H - (v / max) * (H - arriba);
  const finales = tipos.map((k) => ({ k, v: acum[k].at(-1), y: y(acum[k].at(-1)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < finales.length; i++) if (finales[i].y - finales[i - 1].y < 14) finales[i].y = finales[i - 1].y + 14;
  const nom = { G: 'Ganados', E: 'Empatados', P: 'Perdidos' };
  return `<svg class="lineas" viewBox="-18 0 ${W + 18} ${H + 18}" role="img" aria-label="${tipos.map((k) => `${nom[k]}: ${acum[k].at(-1)}`).join(', ')}">
      ${[...new Set([0, Math.round(max / 2), max])].map((g) => `<line class="eje" x1="0" x2="${W - der}" y1="${y(g)}" y2="${y(g)}"/><text x="-6" y="${y(g) + 3}" text-anchor="end">${g}</text>`).join('')}
      <line class="base" x1="0" x2="${W - der}" y1="${H}" y2="${H}"/>
      <text x="0" y="${H + 14}">Fecha 1</text><text x="${W - der}" y="${H + 14}" text-anchor="end">${n}</text>
      ${tipos.map((k) => `<path class="${k}" pathLength="1" d="${acum[k].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('')}
      ${tipos.map((k) => `<circle class="${k}" cx="${x(n)}" cy="${y(acum[k].at(-1))}" r="3.5"/>`).join('')}
      ${finales.map((f) => `<text class="fin ${f.k}" x="${W - der + 8}" y="${f.y + 5}">${f.v}</text>`).join('')}
    </svg>
    <div class="leyenda">${tipos.map((k) => `<span style="--c:${COLOR[k]}"><i></i>${nom[k]}</span>`).join('')}</div>`;
}

function adn(sec) {
  const lista = jugados(sec).slice().reverse();
  if (!lista.length) return '';
  const alto = { G: '100%', E: '55%', P: '22%' };
  return `<div class="adn" role="img" aria-label="Resultados de la temporada en orden">${lista
    .map((p, i) => { const r = resultado(p); return `<i style="--h:${alto[r]};--c:${COLOR[r]};--n:${i}" title="${PALABRA[r]} ${esc(marcadorPropio(p))} con ${esc(rival(p))}"></i>`; })
    .join('')}</div><div class="adn-ext chica"><span>Primera fecha</span><span>Última</span></div>`;
}

const forma = (sec, n = 5) => `<div class="forma">${jugados(sec).slice(0, n).reverse()
  .map((p) => `<span class="r ${resultado(p)}" title="${PALABRA[resultado(p)]} ${esc(marcadorPropio(p))} con ${esc(rival(p))}">${resultado(p)}</span>`).join('')}</div>`;

function pista(sec, f, c) {
  const n = sec.tabla.filas.length;
  const x = n > 1 ? ((f.pos - 1) / (n - 1)) * 100 : 0;
  return `<div role="img" aria-label="Puesto ${f.pos} de ${n}">
      <div class="pista"><div class="pista-linea">${'<i></i>'.repeat(n)}</div><span class="yo" style="left:${x}%">${escudo(c)}</span></div>
      <div class="pista-ext"><span>1°</span><span>${n}°</span></div></div>`;
}

function listaResultados(items) {
  if (!items.length) return '<p class="vacio">Todavía no hay resultados.</p>';
  return `<ul class="resultados">${items.map((p) => {
    const r = resultado(p);
    const derecha = p.jugado
      ? `<span class="marcador"><b>${esc(p.esLocal ? p.gl : p.gv)}<span>–${esc(p.esLocal ? p.gv : p.gl)}</span></b>${r ? `<span class="r ${r}" title="${PALABRA[r]}">${r}</span>` : ''}</span>`
      : `<span class="marcador pendiente"><b>${esc(p.estado === 'Suspendido' ? 'Susp.' : fechaBreve(p.fecha))}</b></span>`;
    return `<li><span class="quien">${p.esLocal ? 'vs' : 'en cancha de'} ${esc(rival(p))}<small>${esc([fechaBreve(p.fecha), p.ronda].filter(Boolean).join(' · '))}</small></span>${derecha}</li>`;
  }).join('')}</ul>`;
}

const COLS = { pts: 'Pts', pj: 'PJ', pg: 'G', pe: 'E', pp: 'P', pf: 'PF', pc: 'PC', dif: 'Dif', bon: 'Bon' };
const EXT = new Set(['pg', 'pe', 'pp', 'pf', 'pc', 'bon']);
function tabla(sec, c) {
  if (!sec.tabla?.filas?.length) return '<p class="vacio">Tabla no disponible.</p>';
  const cols = sec.tabla.columnas;
  return `<div class="tabla-wrap"><table>
    <thead><tr><th>#</th><th class="eq">Equipo</th>${cols.map((k) => `<th class="${EXT.has(k) ? 'ext' : ''}">${COLS[k] || k}</th>`).join('')}</tr></thead>
    <tbody>${sec.tabla.filas.map((f) => `<tr class="${f.esClub ? 'qac' : ''}"><td class="pos">${f.pos}</td><td class="eq">${f.esClub ? `<span>${escudo(c)}${esc(f.equipo)}</span>` : esc(f.equipo)}</td>${cols
      .map((k) => `<td class="${k === 'pts' ? 'pts' : ''} ${EXT.has(k) ? 'ext' : ''}">${esc(k === 'dif' && f[k] > 0 ? `+${f[k]}` : f[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function proximo(p, sec, c) {
  const n = Math.max(largo(p.local), largo(p.visitante));
  const lado = (t, propio) => `<strong class="${propio ? 'local' : 'visita'}" style="--n:${n}">${esc(t)}</strong>`;
  const t = p.fecha ? partes(p.fecha, { weekday: 'short', day: 'numeric', month: 'short' }) : null;
  const yo = filaClub(sec), el = filaDe(sec, rival(p));
  let duelo = '';
  if (yo && el) {
    const filas = [
      ['Posición', yo.pos, el.pos, (a, b) => a < b, (v) => `${v}°`],
      ['Puntos', yo.pts, el.pts, (a, b) => a > b, (v) => v],
      ['Ganados', yo.pg, el.pg, (a, b) => a > b, (v) => v],
      ['Dif. de tantos', yo.dif, el.dif, (a, b) => a > b, (v) => (v > 0 ? `+${v}` : v)],
    ];
    const previo = jugados(sec).find((x) => norm(rival(x)) === norm(rival(p)));
    duelo = `<table class="duelo"><caption class="chica">Cara a cara en la fase regular</caption>
        <thead><tr><th></th><th class="yo">${esc(yo.equipo)}</th><th>${esc(rival(p))}</th></tr></thead>
        <tbody>${filas.map(([k, a, b, mejor, f]) => `<tr><th>${k}</th><td class="${mejor(a, b) ? 'mejor' : ''}">${esc(f(a))}</td><td class="otro">${esc(f(b))}</td></tr>`).join('')}
        ${previo ? `<tr class="cruce-ant"><th>Último cruce</th><td colspan="2">${PALABRA[resultado(previo)]} ${esc(marcadorPropio(previo))}, ${esc(fechaBreve(previo.fecha))}</td></tr>` : ''}</tbody></table>`;
  }
  return `<article class="hero">
      <div class="hero-cab"><span class="deporte-tag">${esc(sec.titulo)}</span><span class="chica"><b>${esc(sec.competencia)}</b>${esc(p.ronda || '')}</span></div>
      <div class="cruce">${lado(p.local, p.esLocal)}<span class="vs chica">${escudo(c)}contra</span>${lado(p.visitante, !p.esLocal)}</div>
      <div class="hero-der">
        <div class="cuando-grande">${t
          ? `<div><b>${esc(sinPunto(t.weekday))} ${esc(t.day)}</b><small class="chica">${esc(sinPunto(t.month))}</small></div>
             <div class="falta"><b>${esc(cuando(p.fecha))}</b><small class="chica">${p.esLocal ? 'De local' : 'De visitante'}${p.sinHora ? ' · hora a confirmar' : ` · ${hora(p.fecha)} h`}</small></div>`
          : `<div><b>A confirmar</b><small class="chica">${p.esLocal ? 'De local' : 'De visitante'}</small></div>`}</div>
        ${duelo}
      </div>
    </article>`;
}

// Cuando el torneo terminó: resumen de cómo le fue.
function balance(sec, c) {
  const js = jugados(sec);
  if (!js.length) return '';
  const ult = js[0];
  const f = filaClub(sec);
  const r = resultado(ult);
  return `<div class="balance">
      <p class="chica">Temporada terminada</p>
      <p class="balance-txt">${f ? `Terminó <b>${f.pos}°</b> de ${sec.tabla.filas.length} en la fase regular` : 'Torneo terminado'}${/playoff|final|semi|cuarto/i.test(ult.ronda || '') ? ` y en ${esc(ult.ronda.toLowerCase())} <b>${PALABRA[r].toLowerCase()} ${esc(marcadorPropio(ult))}</b> con ${esc(rival(ult))}` : ''}.</p>
    </div>`;
}

const titulo = (n, texto, extra = '') => `<header class="franja"><div class="contenedor"><span>${n}</span><h2>${texto}</h2>${extra ? `<p>${extra}</p>` : ''}</div></header>`;

// ---------- Portada: los escudos ----------
function tarjetaClub(c) {
  const sec = c.secciones?.[0];
  const f = sec ? filaClub(sec) : null;
  const ult = sec ? jugados(sec)[0] : null;
  const detalle = c.detalle || (sec ? `Rugby · ${sec.competencia}` : 'Rugby');
  return `<a class="club" href="${esc(c.url || `#${c.id}`)}" style="--club:${esc(c.color || 'var(--fondo-azul)')}">
      <span class="club-escudo">${escudo(c)}</span>
      <span class="club-nombre">${esc(c.nombre)}</span>
      <span class="club-largo chica">${esc(c.nombreLargo || '')}</span>
      <span class="club-detalle">${esc(detalle)}${f ? ` · ${f.pos}°` : ''}</span>
      ${ult ? `<span class="club-ult"><span class="r ${resultado(ult)}">${resultado(ult)}</span>${esc(marcadorPropio(ult))} con ${esc(rival(ult))}</span>` : ''}
      <span class="club-ir" aria-hidden="true">${c.url ? 'Ir al sitio ↗' : 'Ver partidos →'}</span>
    </a>`;
}

function vistaPortada() {
  const todos = [...(datos.externos || []), ...datos.clubes];
  return `<section class="seccion" style="--i:0">
      ${titulo('', 'Elegí tu club', `Temporada ${esc(datos.temporada)}`)}
      <div class="contenedor"><div class="clubes">${todos.map(tarjetaClub).join('')}</div></div>
    </section>`;
}

// ---------- Página de un club ----------
function vistaClub(c) {
  const secs = c.secciones || [];
  const indice = secs.length > 1 ? `<nav class="indice" aria-label="Divisiones"><div class="contenedor"><ol>${secs
    .map((s, i) => { const f = filaClub(s); return `<li><a href="#${esc(c.id)}" data-ir="eq-${esc(s.id)}"><span>${dos(i + 1)}</span>${esc(s.titulo)}${f ? `<b>${f.pos}°</b>` : ''}</a></li>`; }).join('')}</ol></div></nav>` : '';
  return `<div class="portada-franja azul" style="--i:0"><div class="contenedor portada club-portada">
      <h1 style="--n:${largo(c.nombre)}">${esc(c.nombre)}<small>${esc(c.nombreLargo || '')} · Rugby</small></h1>${escudo(c, 'grande')}</div></div>${indice}
    <div class="contenedor">${secs.length ? secs.map((s, i) => seccionHTML(s, c, i)).join('') : '<p class="vacio">Todavía no hay datos de este club.</p>'}</div>`;
}

function seccionHTML(sec, c, i) {
  const f = filaClub(sec);
  const futuros = proximos(sec);
  const todos = [...sec.partidos].map((p) => p);
  return `<section class="equipo-seccion" id="eq-${esc(sec.id)}" style="--i:${i + 1}">
      <header><span class="chica">${esc(sec.competencia)}</span><h2>${esc(sec.titulo)}</h2></header>
      ${sec.desactualizado ? '<div class="aviso">No se pudo actualizar esta sección en la última corrida; se muestran los últimos datos guardados.</div>' : ''}
      <p class="categoria"><span class="situacion">${esc(situacion(sec))}</span></p>
      ${futuros[0] ? `<div class="panel-blanco">${proximo(futuros[0], sec, c)}</div>` : balance(sec, c)}
      ${f ? `<div class="cifras">
          <div><b>${f.pos}°</b><small class="chica">Posición</small></div>
          <div><b>${f.pts}</b><small class="chica">Puntos</small></div>
          <div><b>${f.pg}-${f.pp}</b><small class="chica">Ganados-perdidos</small></div>
          <div><b>${f.dif > 0 ? `+${f.dif}` : f.dif}</b><small class="chica">Dif. tantos</small></div>
        </div>` : ''}
      <div class="columnas">
        <div>
          <div class="bloque"><div class="bloque-cab"><h3>Fecha a fecha</h3><span class="chica">Acumulado</span></div>${lineas(sec)}</div>
          <div class="bloque"><div class="bloque-cab"><h3>ADN de la temporada</h3><span class="chica">${jugados(sec).length} partidos</span></div>${adn(sec)}</div>
          <div class="bloque"><div class="bloque-cab"><h3>Últimos partidos</h3>${forma(sec)}</div>${listaResultados(jugados(sec).slice(0, 5))}</div>
        </div>
        <div>
          <div class="bloque"><div class="bloque-cab"><h3>Tabla de posiciones</h3><span class="chica">${esc(sec.tabla?.nombre || '')}</span></div>${tabla(sec, c)}
            ${f ? `<div class="bloque-pista">${pista(sec, f, c)}</div>` : ''}
            <details class="fixture"><summary>Fixture completo · ${todos.length} partidos</summary>${listaResultados(todos)}</details>
          </div>
        </div>
      </div>
    </section>`;
}

// ---------- Navegación ----------
function menu(actual) {
  const items = [['inicio', 'Inicio'], ...datos.clubes.map((c) => [c.id, c.nombre])];
  document.getElementById('nav').innerHTML = items
    .map(([id, n], i) => `<a href="#${id}" data-vista="${id}"${id === actual ? ' aria-current="page"' : ''}><b>${dos(i)}</b><span>${esc(n)}</span></a>`).join('');
}

function mostrar() {
  const id = location.hash.slice(1);
  club = datos.clubes.find((c) => c.id === id) || null;
  const raiz = document.documentElement;
  // Cada club tiñe la página con su color.
  if (club) { raiz.style.setProperty('--fondo-azul', club.color); raiz.style.setProperty('--azul', club.color); }
  else { raiz.style.removeProperty('--fondo-azul'); raiz.style.removeProperty('--azul'); }
  menu(club ? club.id : 'inicio');
  const ya = raiz.classList.contains('mostrado');
  if (ya) raiz.classList.remove('mostrado');
  $contenido.innerHTML = club ? vistaClub(club) : vistaPortada();
  window.scrollTo(0, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('mostrado')));
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ir]');
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.ir)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});

// ---------- Arranque ----------
document.getElementById('ano').textContent = new Date().getFullYear();
try {
  const r = await fetch(`data/clubes.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  datos = await r.json();
  const g = new Date(datos.generado);
  document.getElementById('actualizado').textContent = `Actualizado ${fechaBreve(g).toLowerCase()}, ${hora(g)} h`;
  addEventListener('hashchange', mostrar);
  mostrar();
} catch (e) {
  document.getElementById('actualizado').textContent = 'Sin datos';
  $contenido.innerHTML = `<div class="contenedor error-carga">No se pudieron cargar los datos (${esc(e.message)}). Probá recargar en unos minutos.</div>`;
  document.documentElement.classList.add('mostrado');
}
