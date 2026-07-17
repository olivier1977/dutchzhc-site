# Voiceover Script — DID & Verifiable Credentials Explainer

**Status: not yet recorded.** `ELEVENLABS_API_KEY` is not set in this environment, so the
pilot render (`out/did-vc-explainer.mp4`) ships with on-screen captions and no audio track
narration (a silent AAC stub, muxed so the file is a valid two-track MP4 for platform
uploaders that expect audio). Once an API key is available, generate one clip per line
below and drop the files into `audio/` (see README "Adding ElevenLabs voiceover").

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

Total runtime: 33s (990 frames @ 30fps), matches the video timeline in `src/Video.tsx`.

## Generating the audio (once ELEVENLABS_API_KEY is set)

```bash
export ELEVENLABS_API_KEY=sk_...
node scripts/generate-voiceover.mjs
```

`scripts/generate-voiceover.mjs` (to be added alongside the key) should call
`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` once per row above, save each
clip as `audio/line-01.mp3` … `audio/line-06.mp3`, and the composition should add a `<Audio>`
Remotion component per `<Sequence>` in `src/Video.tsx` referencing the matching clip via
`staticFile()`. This pilot intentionally ships without that wiring since there is no key to
test against yet — see README "Known limitation" for the handoff.
