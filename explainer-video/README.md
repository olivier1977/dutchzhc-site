# DID & Verifiable Credentials Explainer — Remotion Pilot (DUTA-1164)

Pilot for the code-native, no-human-editor video pipeline recommended in DUTA-1163:
React-based video generation via [Remotion](https://www.remotion.dev/), with ElevenLabs
slated for voiceover. Output: a 33s branded MP4 for LinkedIn / Dev.to.

## What's in this pilot

- `src/Video.tsx` — composition timeline (6 scenes, 990 frames @ 30fps = 33s)
- `src/scenes/*` — Intro, Problem, DID explainer, VC explainer, Trust, Outro
- `src/components/*` — reusable node-network background, feature cards, captions, watermark
- `src/theme.ts` — DZHC brand colors lifted from `create_linkedin_image_*.py`
  (navy `#1E3A5F`, gold `#F18F01`, blue `#2E86AB`, node-network motif)
- `voiceover-script.md` — timestamped VO lines ready for ElevenLabs, not yet recorded
- `out/did-vc-explainer.mp4` — rendered output (1920x1080, H.264, 33s, ~4MB)

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

## Known limitation: no ElevenLabs voiceover yet

`ELEVENLABS_API_KEY` is not set in this environment, so this pilot ships with on-screen
captions only — no recorded narration. `voiceover-script.md` has the full timestamped script
ready to feed the ElevenLabs API the moment a key is provisioned. Wiring it in is additive
(one `<Audio>` per `<Sequence>` in `src/Video.tsx`), not a rework.

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
