// Junta los datos de la URBA y escribe public/data/clubes.json.
// La temporada y los torneos de cada club se descubren solos (no hay que tocar nada cada año).
// Si algo falla, conserva lo que había de esa sección y la marca como desactualizada.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { temporadaActual, torneosDelClub, torneo, seccion } from './sources/urba.js';

const RUTA = new URL('../public/data/clubes.json', import.meta.url);
const config = JSON.parse(await readFile(new URL('../config.json', import.meta.url), 'utf8'));
const zona = config.zonaHoraria;
const ahora = new Date().toISOString();

let anterior = { clubes: [] };
try { anterior = JSON.parse(await readFile(RUTA, 'utf8')); } catch { /* primera corrida */ }
const previa = (clubId, secId) => anterior.clubes?.find((c) => c.id === clubId)?.secciones?.find((s) => s.id === secId);

const errores = [];
const temporada = await temporadaActual();
const cache = new Map(); // los dos clubes comparten torneo: se baja una sola vez
const traer = (id) => { if (!cache.has(id)) cache.set(id, torneo(id)); return cache.get(id); };

const clubes = [];
for (const club of config.clubes) {
  const secciones = [];
  let lista = [];
  try { lista = await torneosDelClub(temporada, club.urbaClubId); } catch (e) { errores.push(`${club.id}: ${e.message}`); }
  for (const div of config.divisiones) {
    const id = `${club.id}-${div.id}`;
    try {
      const t = lista.find((x) => new RegExp(div.patron, 'i').test(x.name));
      if (!t) throw new Error(`no encontré "${div.titulo}" en ${temporada}`);
      const s = seccion(await traer(t.id), club, div, zona);
      secciones.push({ ...s, actualizado: ahora, desactualizado: false });
      console.log(`✔ ${id}: ${s.partidos.length} partidos, ${s.tabla?.filas.length ?? 0} equipos`);
    } catch (e) {
      errores.push(`${id}: ${e.message}`);
      console.error(`✘ ${id}: ${e.message}`);
      const vieja = previa(club.id, id);
      if (vieja) secciones.push({ ...vieja, desactualizado: true, error: e.message });
    }
  }
  clubes.push({ ...club, secciones });
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(RUTA, JSON.stringify({ generado: ahora, temporada, externos: config.externos, clubes, errores }, null, 2) + '\n');
console.log(`Listo: temporada ${temporada}, ${clubes.reduce((n, c) => n + c.secciones.length, 0)} secciones, ${errores.length} errores.`);
if (clubes.every((c) => c.secciones.every((s) => s.desactualizado))) process.exit(1);
