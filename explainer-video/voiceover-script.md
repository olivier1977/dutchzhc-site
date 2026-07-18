# Voiceover Script — DID & Verifiable Credentials Explainer

**Status: recorded (2026-07-18).** Narrated with ElevenLabs voice `onwK4e9ZLuTAKqWW03F9`
("Daniel — Steady Broadcaster"), model `eleven_multilingual_v2`. Clips live in
`public/audio/line-01.mp3` … `line-06.mp3` and are wired into `src/Video.tsx` via one
`<Audio>` per `<TransitionSeries.Sequence>`. The audio lines themselves are unchanged since
recording — only the on-screen scene durations were extended (see below).

**Revised 2026-07-18** after board feedback that the cuts felt too abrupt and the animation
too static. Scenes now crossfade into each other (`@remotion/transitions`, 16-frame fade)
instead of hard-cutting, each scene runs longer than its narration line so on-screen
animation has room to finish before the next crossfade starts, and the DID/VC/Trust scenes
now show an animated step-by-step flow diagram (agent → DID → credential → verifier) rather
than static bullet cards, so the mechanism is followable without reading. Total runtime grew
from 33s to ~41.3s to fit this pacing — `out/did-vc-explainer.mp4` has synced video/AAC audio
tracks (41.33s / 41.39s respectively).

Target voice: confident, clear, mid-pace enterprise/explainer tone. Recommended ElevenLabs
model: `eleven_multilingual_v2` or `eleven_turbo_v2_5`. Recommended stability ~0.45,
similarity ~0.8 for a steady, non-breathy delivery.

| # | Timestamp (frame @30fps) | Scene | Line | Approx. duration |
|---|---|---|---|---|
| 1 | 0:00 (f0) | Intro | "Infrastructure for the agentic economy. DID and Verifiable Credentials." | 5s |
| 2 | 0:05 (f150) | Problem | "How does an autonomous agent prove who it is — without a human in the loop?" | 6s |
| 3 | 0:11 (f330) | DID | "A DID — a Decentralized Identifier — gives every agent a W3C-standard identity. No centralized registry required." | 7s |
| 4 | 0:18 (f540) | VC | "Verifiable Credentials are EdDSA-signed attestations: cryptographic proof an agent is who — and what — it claims to be." | 7s |
| 5 | 0:25 (f750) | Trust | "Agent to agent. Org to org. Trust that's verifiable in milliseconds, not weeks." | 5s |
| 6 | 0:30 (f900) | Outro | "DutchZHC. Identity infrastructure for the agentic economy." | 3s |

Timestamps above are each line's position within its own scene (narration start), not the
final video timeline — scenes now run longer than their narration and crossfade into the
next, so the actual on-screen timing is a few hundred ms later per scene. See `SCENES` in
`src/Video.tsx` for the authoritative per-scene frame durations. Total runtime: ~41.3s
(1240 frames @ 30fps, after 5 crossfades of 16 frames each).

## Regenerating the audio

```bash
# ELEVENLABS_API_KEY lives in explainer-video/.env (gitignored, not committed)
node --env-file=.env scripts/generate-voiceover.mjs
npm run render
```

`scripts/generate-voiceover.mjs` parses this table, calls
`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` once per row, and writes each
clip to `public/audio/line-01.mp3` … `line-06.mp3`. `src/Video.tsx` renders one `<Audio>`
per `<Sequence>` referencing the matching clip via `staticFile()`.
