// Rugby: URBA (urba.org.ar). La página de fixture se arma con una API JSON pública:
//   /api/fixture/filters                      → clubes y temporadas
//   /api/fixture/menu?seasonId=&clubId=       → torneos donde juega un club
//   /api/fixture/championship/{id}            → fechas, partidos y resultados
// La URBA no publica la tabla: se calcula con los resultados de la fase regular.

const BASE = 'https://urba.org.ar/api/fixture';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export async function json(url) {
  let ultimo;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
      return await r.json();
    } catch (e) {
      ultimo = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw ultimo;
}

/** Temporada abierta (la que no está "closed"); si no hay, la del año. */
export async function temporadaActual() {
  const f = await json(`${BASE}/filters`);
  const abiertas = (f.seasons || []).filter((s) => !s.closed).map((s) => s.id);
  return abiertas.length ? Math.max(...abiertas) : new Date().getFullYear();
}

export async function torneosDelClub(temporada, clubId) {
  const m = await json(`${BASE}/menu?seasonId=${temporada}&clubId=${clubId}`);
  return m.championships || [];
}

export async function torneo(id) {
  const d = await json(`${BASE}/championship/${id}`);
  if (!d.championship) throw new Error(`URBA: torneo ${id} sin datos`);
  return d.championship;
}

/** "PRIMERA B - Superior" → "Primera B · Superior"; "PLAYOFF" → "Playoff". */
export function prolijo(t) {
  return String(t || '')
    .split(' - ')
    // Solo lo que viene todo en mayúsculas pasa a "Título"; las letras sueltas (la "B" de Primera B) quedan.
    .map((p) => p.trim().replace(/^[A-ZÁÉÍÓÚÑ ]+$/u, (w) => w.toLowerCase().replace(/(^|\s)(\p{L})(\p{L}*)/gu, (_, e, a, r) => e + a.toUpperCase() + r)))
    .join(' · ');
}

const esRegular = (ronda) => /^fecha\s*\d+/i.test(ronda.name || '');
const fechaISO = (playdate, zona) => (playdate ? `${String(playdate).slice(0, 10)}T12:00:00${zona}` : null);
const jugado = (m) => m.fulfilled && !m.suspended && m.local_team_score != null && m.visit_team_score != null;

/**
 * Tabla de la fase regular. Puntos: 4 ganar, 2 empatar, 0 perder,
 * + bonus ofensivo (lo informa la URBA) + 1 bonus defensivo por perder por 7 o menos.
 */
export function calcularTabla(champ, clubId) {
  const eq = new Map();
  const fila = (t) => {
    if (!eq.has(t.id)) eq.set(t.id, { equipo: t.name, equipoId: t.id, clubId: t.club_id, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, bon: 0, pts: 0 });
    return eq.get(t.id);
  };
  for (const r of champ.rounds || []) {
    if (!esRegular(r)) continue;
    for (const m of r.matches || []) {
      const L = fila(m.local_team), V = fila(m.visit_team);
      if (!jugado(m)) continue;
      const gl = m.local_team_score, gv = m.visit_team_score;
      for (const [yo, a, b, bo] of [[L, gl, gv, m.local_team_offensive_bonus], [V, gv, gl, m.visit_team_offensive_bonus]]) {
        yo.pj++; yo.pf += a; yo.pc += b;
        const bonus = (bo || 0) + (a < b && b - a <= 7 ? 1 : 0);
        yo.bon += bonus;
        if (a > b) { yo.pg++; yo.pts += 4; } else if (a === b) { yo.pe++; yo.pts += 2; } else yo.pp++;
        yo.pts += bonus;
      }
    }
  }
  return [...eq.values()]
    .map((f) => ({ ...f, dif: f.pf - f.pc }))
    .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.pf - a.pf)
    .map((f, i) => ({ pos: i + 1, ...f, esClub: f.clubId === clubId }));
}

/** Partidos del club en el torneo (fase regular y playoffs). */
export function partidosDelClub(champ, clubId, zona = '-03:00') {
  const out = [];
  for (const r of champ.rounds || []) {
    for (const m of r.matches || []) {
      const local = m.local_team.club_id === clubId, visita = m.visit_team.club_id === clubId;
      if (!local && !visita) continue;
      const ok = jugado(m);
      out.push({
        fecha: fechaISO(r.playdate, zona),
        sinHora: true, // la URBA publica el día, no la hora
        ronda: prolijo(r.name),
        local: m.local_team.name,
        visitante: m.visit_team.name,
        esLocal: local,
        gl: ok ? m.local_team_score : null,
        gv: ok ? m.visit_team_score : null,
        jugado: ok,
        estado: m.suspended ? 'Suspendido' : ok ? 'Finalizado' : 'Programado',
      });
    }
  }
  return out.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

/** Arma la sección de una división (Primera, Intermedia…) de un club. */
export function seccion(champ, club, div, zona) {
  const filas = calcularTabla(champ, club.urbaClubId);
  return {
    id: `${club.id}-${div.id}`,
    deporte: 'rugby',
    deporteNombre: 'Rugby',
    titulo: div.titulo,
    competencia: prolijo(champ.name),
    fuente: 'URBA',
    tabla: filas.length ? { nombre: 'Fase regular · tabla calculada', columnas: ['pts', 'pj', 'pg', 'pe', 'pp', 'pf', 'pc', 'dif', 'bon'], filas } : null,
    partidos: partidosDelClub(champ, club.urbaClubId, zona),
  };
}
