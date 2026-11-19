import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTabla, partidosDelClub, prolijo } from '../scripts/sources/urba.js';

// Misma forma que /api/fixture/championship/{id} de la URBA.
const eq = (id, club, name) => ({ id, name, club_id: club });
const CUQ = eq(1, 27, 'C.U. de Quilmes'), DB = eq(2, 37, 'Don Bosco'), BN = eq(3, 40, 'Banco Nacion');
const m = (l, v, gl, gv, bl = 0, bv = 0, ok = true) => ({ fulfilled: ok, suspended: false, local_team: l, visit_team: v, local_team_score: ok ? gl : null, visit_team_score: ok ? gv : null, local_team_offensive_bonus: bl, visit_team_offensive_bonus: bv });
const champ = {
  name: 'PRIMERA B - Superior',
  rounds: [
    { name: 'Fecha 1', playdate: '2026-03-14T00:00:00', matches: [m(CUQ, DB, 30, 25, 1, 0)] },        // CUQ 4+1, DB 0+1 (perdió por 5)
    { name: 'Fecha 2', playdate: '2026-03-21T00:00:00', matches: [m(BN, CUQ, 40, 10)] },               // BN 4, CUQ 0 (perdió por 30)
    { name: 'Fecha 3', playdate: '2026-03-28T00:00:00', matches: [m(DB, BN, 20, 20)] },                // empate: 2 y 2
    { name: 'PLAYOFF', playdate: '2026-10-31T00:00:00', matches: [m(CUQ, BN, 22, 27)] },               // no cuenta en la tabla
    { name: 'Fecha 4', playdate: '2026-11-21T00:00:00', matches: [m(DB, CUQ, 0, 0, 0, 0, false)] },    // sin jugar
  ],
};

test('urba: nombres prolijos', () => {
  assert.equal(prolijo('PRIMERA B - Superior'), 'Primera B · Superior');
  assert.equal(prolijo('PLAYOFF'), 'Playoff');
});

test('urba: tabla calculada con bonus ofensivo y defensivo, sin playoffs', () => {
  const t = calcularTabla(champ, 27);
  const de = (n) => t.find((f) => f.equipo === n);
  assert.deepEqual([de('C.U. de Quilmes').pts, de('C.U. de Quilmes').pj, de('C.U. de Quilmes').bon], [5, 2, 1]);
  assert.deepEqual([de('Don Bosco').pts, de('Don Bosco').bon], [3, 1]);
  assert.equal(de('Banco Nacion').pts, 6);
  assert.equal(t[0].equipo, 'Banco Nacion');
  assert.equal(t.filter((f) => f.esClub).length, 1);
});

test('urba: partidos del club, con playoff y el que falta jugar', () => {
  const p = partidosDelClub(champ, 27);
  assert.equal(p.length, 4);
  assert.deepEqual(
    { fecha: p[1].fecha, local: p[1].local, esLocal: p[1].esLocal, gl: p[1].gl, gv: p[1].gv, ronda: p[1].ronda },
    { fecha: '2026-03-21T12:00:00-03:00', local: 'Banco Nacion', esLocal: false, gl: 40, gv: 10, ronda: 'Fecha 2' },
  );
  assert.equal(p[2].ronda, 'Playoff');
  assert.equal(p[3].jugado, false);
  assert.equal(p[3].gl, null);
});
