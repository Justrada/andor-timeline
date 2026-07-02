# Andor · Countdown to the Sunrise

An interactive, **spoiler-safe** timeline of *Andor* — from the fall of the Republic through
Rogue One and the Battle of Yavin — with a built-in **spoiler shield**.

**Live site:** https://justrada.github.io/andor-timeline/

## How it works

Tell the archive the last episode you finished (S1E1 → S2E12) and which films you've seen
(Revenge of the Sith, Rogue One, A New Hope, Return of the Jedi). Everything beyond your
clearance is rendered as ISB-style redacted censor bars — event files, character dossiers,
the relay chain, era summaries, and behind-the-scenes facts all unseal exactly as far as
you've watched, and no further.

- **Remembers your progress** — stored in `localStorage`, this browser only; nothing is sent anywhere.
- **New-intel tracking** — when you advance an episode, freshly declassified files are flagged
  with green `NEW INTEL` markers until you open them. A counter on the shield button keeps score.
- **Living dossiers** — character files grow stage by stage as you watch; fates stay sealed
  until the moment you've actually seen them land.
- **The Production Vault** — 20+ verified behind-the-scenes facts, each gated to the episode
  it touches.
- **Next-up strip** — one-click "I just watched it" to advance, with the official episode title.
- **Declassification meter** — the rail tracks what percentage of the archive you've unlocked.

## Development

It's a single static `index.html` — no build step, no dependencies.

```sh
python3 -m http.server 8437
# open http://localhost:8437
```

Episode gates use global numbering (S1E1=1 … S2E12=24) and live alongside the content in the
`<script id="data">` block. Episode attributions and BTS facts were verified against episode
guides and published interviews.

## Disclaimer

Unofficial fan reference. Plot summary and analysis only. Not affiliated with Lucasfilm or Disney.
