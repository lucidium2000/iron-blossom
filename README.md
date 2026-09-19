# Iron Blossom

A browser fighting game set at the Iron Blossom music festival — Midtown Green, Richmond, Virginia.

Ten fighters drawn from the real 2026 bill, five stages, destructible scenery, a crowd that
heckles you, and a twenty-second victory encore with a full light show. No engine, no build
step, no assets: every sprite is drawn with Canvas 2D and every note is synthesised at runtime
with the Web Audio API.

**Play it:** open `index.html`, or visit the GitHub Pages link on this repo.

---

## Unofficial fan tribute

This is a non-commercial fan project. It is not affiliated with, endorsed by, or connected to
the Iron Blossom festival, its organisers, or any of the artists depicted.

The fighters are original stylised caricatures, drawn in code from public photographs — no
artwork, photography, logos or branding belonging to anyone else is included or reproduced.

The music is **original composition**. Each act's theme is written in that act's own idiom —
its tempo range, key centre, instrumentation, groove and production signature — but none of it
is a transcription of any existing song. Where a real record informed a theme it did so through
facts that aren't anyone's property: that a song sits at 124 BPM in E minor, that a record is
built on a four-on-the-floor kick and a cowbell, that a guitar sound is soaked in spring reverb.

## Controls

| | Player 1 | Player 2 |
|---|---|---|
| Move (tap twice to dash) | `A` `D` | `←` `→` |
| Jump / crouch | `W` / `S` | `↑` / `↓` |
| Light | `J` | `1` |
| Heavy | `K` | `2` |
| Kick | `L` | `3` |
| Grab / pick up scenery | `U` | `4` |
| Special (50% meter) | `I` | `5` |
| Second special (50%) | `S` + `I` | `↓` + `5` |
| Super (100%) | `W` + `I` | `↑` + `5` |
| Pause | `Esc` | |

Block by holding away from your opponent. Crouch-block stops sweeps; stand-block stops overheads.

## Modes

- **Festival Run** — five sets across five stages, difficulty climbing to a headliner
- **Two Player** — same keyboard
- **Single Match** — pick both fighters and the stage

## How it's built

Plain ES5-ish JavaScript, no dependencies, loaded as classic scripts.

| File | What's in it |
|---|---|
| `js/util.js` | Maths, colour mixing, the tapered-capsule path used by every limb |
| `js/audio.js` | Synth voices, the step sequencer, ten per-artist themes |
| `js/rig.js` | Skeleton, pose library, face and hair rendering |
| `js/roster.js` | The ten fighters: looks, stats, frame data, moves |
| `js/art.js` | Fighter renderer, instruments, portraits |
| `js/stages.js` | Five stages, pre-rendered into cached parallax layers |
| `js/crowd.js` | ~760 concertgoers, pit security, heckles |
| `js/props.js` | Barrels, kegs, amps, anvils — everything breakable |
| `js/fx.js` | Particles, impacts, stage weather |
| `js/specials.js` | Two specials and a super per fighter |
| `js/fighter.js` | State machine, physics, hitboxes, encore routines |
| `js/ai.js` | CPU opponent |
| `js/game.js` | Match loop, camera, collision, the encore light show |
| `js/main.js` | Boot, input, menus |

### Running locally

Any static server works — the game needs no backend:

```bash
python3 -m http.server 8321
```

Then open <http://localhost:8321>.

`bump.py` is a development helper that appends cache-busting tokens to the script tags, so
edits show up without a hard reload. It isn't needed to play.

## Licence

Code is MIT (see `LICENSE`). The artists' names are their own and are used here as fan tribute
only.
