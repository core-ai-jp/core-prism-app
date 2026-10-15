# CORE YouTube Editing Workflow

Status: **workflow specification only; no media processor, upload connector, or scheduled job has been deployed**.

## Trigger
User provides an original video in chat or a specifically authorized Drive folder and asks for editing. Verify that the media bytes are accessible before claiming rendering is possible. If not accessible, request a direct upload or accessible file. Never assume a link grants access.

## Default deliverables
- Main video: 16:9, 1080p target, H.264 MP4, audio AAC, retain original frame rate when possible.
- Short clips: 9:16, 1080x1920 target, 20–45 seconds, user-selected or transcript-supported highlights; do not invent quotes.
- Captions: Japanese SRT, plus burned-in version when requested.
- Thumbnail: 1280x720 image with legible Japanese headline.
- Metadata: 3 title options, description, chapters only if timestamps verified, short descriptions and upload checklist.
- Output a compact manifest linking all generated artifacts and recording any skipped deliverables.

## Editing plan
1. Inspect source duration, codecs, audio channels, orientation, quality and rights; save source fingerprint.
2. Extract or transcribe audio **once**; cache by source fingerprint. Preserve raw transcript and timestamps.
3. Propose cut list using actual timestamps: remove extended silence, repeated starts and obvious mistakes, but do not remove meaning or misleadingly splice quotes. Preserve educational accuracy.
4. Create a low-resolution draft or short segment before rendering the full video.
5. Use local FFmpeg for cuts, loudness normalization, safe fades, aspect conversion and caption burn-in when available. Use licensed BGM only when requested; no paid generation by default.
6. Review final audio sync, caption accuracy, safe margins, black frames, clip boundaries and factual claims.
7. Export to user-accessible files. Upload only as private/unlisted draft after explicit authorization and verified YouTube credentials. **Public publishing always requires separate approval.**

## Style: CORE beginner AI education
- Clear Japanese; engaging first 3–5 seconds without clickbait.
- Minimal clean blue/white CORE styling, with large readable captions and purposeful screen recordings.
- Prioritize comprehensibility and genuine demonstrations over flashy transitions.
- Keep original speech unless user approves rewriting/dubbing. Do not generate a synthetic likeness or voice without consent.

## Token/credit controls
- One canonical job manifest: `job_id`, source hash, user instructions, cached transcript path, edit decisions, deliverables, completion flags.
- Only inspect relevant source clips and transcript ranges; never re-read or retranscribe unchanged source.
- Batch title/description/thumbnail planning in one pass.
- Render one preview first; one revision round per specific feedback rather than uncontrolled loops.
- Prefer local deterministic editing to paid AI generation. Estimate and obtain approval before paid rendering.
- Do not repeatedly poll external jobs; use returned job status and a bounded check.
- Record measured processing time and paid usage, never assert unmeasured token savings.

## Boundaries
ChatGPT conversation uploads may be limited in file size, length or media access. This document does not itself install FFmpeg, speech recognition, YouTube OAuth or automation. If execution tools cannot process the footage, provide a precise editing decision list and explain the missing integration. Never claim the video is edited until an actual playable export exists.
