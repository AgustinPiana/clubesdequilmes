# Agenda de Clubes

Portada con los escudos de los clubes y una página por club con fixture, resultados y tabla de rugby:

| Club | Fuente | Divisiones |
|---|---|---|
| Círculo Universitario de Quilmes (CUQ) | URBA | Primera e Intermedia |
| Ateneo Don Bosco | URBA | Primera e Intermedia |
| Quilmes Atlético Club | Link a su propia página | — |

Costo: **$0**. GitHub Actions junta los datos 6 veces por día y Vercel publica la página.

## Cómo funciona

```
GitHub Actions (09, 13, 17, 20, 22 y 00 h, con respaldo 30 min después)
   └─ npm run update  →  public/data/clubes.json  →  commit
                                                     └─ Vercel publica de nuevo
Página (public/)  →  lee data/clubes.json
```

- La URBA tiene una API pública (la misma que usa su página de fixture):
  `/api/fixture/filters`, `/api/fixture/menu?seasonId=&clubId=` y `/api/fixture/championship/{id}`.
- **La temporada y los torneos se descubren solos**: no hay que tocar nada cuando empieza un año nuevo.
- La URBA no publica la tabla: se **calcula** con los resultados de la fase regular
  (4 puntos ganar, 2 empatar, bonus ofensivo informado por la URBA y 1 punto de bonus defensivo por perder por 7 o menos).
  Puede diferir de la oficial si hay sanciones o puntos descontados.
- La URBA publica el día de cada partido pero no la hora.

## Configuración (`config.json`)

- `clubes[]`: `urbaClubId` (sale de `/api/fixture/filters`), escudo y colores de cada club.
- `divisiones[]`: qué torneos mostrar de cada club, por un texto del nombre (`- Superior$`, `- Intermedia$`).
- `externos[]`: clubes que solo aparecen en la portada con un link (Quilmes).

## Comandos

```bash
npm run update   # junta los datos y escribe public/data/clubes.json
npm test         # prueba el cálculo de la tabla y los partidos
npx serve public # ver la página en http://localhost:3000
```

Los escudos de CUQ y Don Bosco son los que publica la URBA; el de Quilmes viene de Wikimedia Commons (dominio público).
