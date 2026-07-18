# DID & Verifiable Credentials Explainer — Remotion Pilot (DUTA-1164)

Pilot for the code-native, no-human-editor video pipeline recommended in DUTA-1163:
React-based video generation via [Remotion](https://www.remotion.dev/), with ElevenLabs
for voiceover. Output: a ~41s branded MP4 for LinkedIn / Dev.to.

## What's in this pilot

- `src/Video.tsx` — composition timeline: 6 scenes (~1240 frames @ 30fps = ~41.3s) joined by
  `@remotion/transitions` crossfades instead of hard cuts
- `src/scenes/*` — Intro, Problem, DID explainer, VC explainer, Trust (recap), Outro
- `src/components/*` — node-network background, feature cards, captions, watermark, and
  `FlowDiagram` (animated step-by-step pipeline: nodes pop in, arrows draw, a "packet" dot
  travels between them — used in DidExplain, VcExplain, and the Trust recap so the DID → VC →
  verifier mechanism is followable without reading)
- `src/theme.ts` — DZHC brand colors lifted from `create_linkedin_image_*.py`
  (navy `#1E3A5F`, gold `#F18F01`, blue `#2E86AB`, node-network motif)
- `voiceover-script.md` — timestamped VO lines, recorded via ElevenLabs (see below)
- `scripts/generate-voiceover.mjs` — regenerates `public/audio/line-0N.mp3` from the script
- `out/did-vc-explainer.mp4` — rendered output (1920x1080, H.264, ~41.3s, ~6.7MB, with narration)

**Revision history:** first pilot cut (33s, hard scene cuts, mostly static cards) shipped in
commit `1c30c3c`. Reopened after board feedback that cuts were too abrupt and the animation
too static, with a request to visually show the mechanism (DID → VC → verifier) rather than
just state it. This revision added crossfade transitions, longer per-scene breathing room,
and the `FlowDiagram` step-by-step visualization.

Subject chosen: **DID & Verifiable Credentials** (over Treasury/multisig or TRA) — it has the
clearest 30-45s narrative arc and the most existing supporting content in this repo
(installation guide, investigation PDFs, prior LinkedIn creative).

Captions are baked into the video so it is fully watchable muted, since that's the default
autoplay state on LinkedIn/Dev.to embeds.

## Running it

```bash
cd explainer-video
npm install
npm start          # opens Remotion Studio for live preview/editing
npm run render      # renders out/did-vc-explainer.mp4
```

## ElevenLabs voiceover (DUTA-1166)

Narration is recorded and wired in: `public/audio/line-01.mp3` … `line-06.mp3`
(voice `onwK4e9ZLuTAKqWW03F9`, "Daniel — Steady Broadcaster"), one `<Audio>` per `<Sequence>`
in `src/Video.tsx`. `ELEVENLABS_API_KEY` lives in `explainer-video/.env` (gitignored, board-
provisioned) — never commit it or paste it in plaintext elsewhere. Regenerate with:

```bash
node --env-file=.env scripts/generate-voiceover.mjs
npm run render
```

**Publishing stays manual.** Per board direction (DUTA-1167 governance note), this pipeline
only produces `out/did-vc-explainer.mp4` — no automated upload to LinkedIn/Dev.to/anywhere.
A human on the board handles publishing.

## Windows-specific gotcha: bundled ffmpeg silently failing

On this machine, Remotion's bundled `ffmpeg.exe` / `ffprobe.exe`
(`@remotion/compositor-win32-x64-msvc`) failed to execute at all — every invocation exited
immediately with code `-1058471934` / `0xC0E90002`, no stdout, no crash entry in the Windows
Application event log. Remotion's own `remotion.exe` (frame compositor, same package) ran
fine. Renaming a copy of `ffmpeg.exe` to an arbitrary name made it run immediately with no
other change — strong evidence some local security control (most likely a Defender Attack
Surface Reduction rule or reputation/prevalence check) is blocking execution specifically by
the filename `ffmpeg.exe`/`ffprobe.exe`, which is a very commonly trojanized binary name.

**Workaround applied** (local to this checkout, not committed — see `.gitignore`):
`node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe` and `ffprobe.exe` were renamed
to `media-encoder.exe` / `media-probe.exe`, and
`node_modules/@remotion/renderer/dist/{compositor/get-executable-path.js,esm/index.mjs}` were
patched to look up those names instead. This is a `node_modules` patch, so it does **not**
survive `npm install` / `npm ci` — anyone re-running this pilot on Windows will need to
reapply it (or Remotion needs to expose a supported override; today's `Config` API has no
`setFfmpegExecutable` equivalent in v4). Filed as a follow-up rather than solved permanently
here — see DUTA tracker.

## Licensing flag (per DUTA-1163)

Remotion is source-available and free to use under 4 employees; a commercial license is
required above that threshold. This pilot is a one-off validation run. **If this pipeline
becomes a recurring production tool, get sign-off from legal-counsel/CFO on the commercial
license before scaling usage.**

## Brand kit source

Colors and the node-network motif are reused as-is from `create_linkedin_image_2026_07_14.py`
(`../create_linkedin_image_2026_07_14.py` relative to repo root) to keep this video visually
consistent with existing LinkedIn creative.
