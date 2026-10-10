# YouTube assisted production pipeline (design, not deployed)

1. Human records video and selects approved source assets.
2. Ingest a single source folder and create a short job manifest with source links, rights, language, and target formats.
3. Draft transcript and proposed edit decision list; human approves factual and sensitive content.
4. Generate title, description, thumbnail concepts, and short-clip candidates from approved transcript.
5. Render a private preview; check subtitles, audio, cuts, branding, and copyright.
6. Upload only as private/unlisted draft where supported and explicitly authorized.
7. Human reviews and manually approves public release.

Token efficiency: cache transcript and source metadata, reuse one canonical manifest, generate variants only on request, and never repeatedly transcribe unchanged video. No auto-publishing, external messages, or paid render jobs without explicit approval. Video editing, rendering, upload credentials and platform integration remain separate implementation tasks.
