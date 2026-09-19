# AI Video Studio

Local-first AI video production studio added alongside the existing repository content.

## Run

```bash
cp .env.example .env
npm install
npm start
```

Open http://localhost:3000.

The studio uses OpenAI for creative planning and keeps video generation behind a provider adapter. This avoids coupling the application to a single video API.

## Current MVP

- AI creative director
- structured scene plans
- 9:16 / 1080x1920 production target
- 45-60 second planning target
- local JSON project persistence
- provider abstraction
- render-plan output
- minimal browser UI

Next production steps: add authenticated project storage, a real video-provider adapter, TTS, caption rendering, asset/character bible, background music/SFX mixing, FFmpeg assembly, job queue and progress events.


## Production pipeline

The studio now supports an end-to-end local pipeline:

1. Generate a format-aware production plan with OpenAI Structured Outputs.
2. Normalize the plan into a storyboard.
3. Optionally generate Dutch voiceover with OpenAI TTS.
4. Create clip jobs through the provider abstraction.
5. Assemble supplied video clips with FFmpeg at the exact selected canvas size.
6. Render supplied thumbnail images to the exact PNG dimensions.
7. Run automated format/render/pipeline tests through GitHub Actions.

The local provider is intentionally deterministic: it creates clip jobs and accepts imported/generated clip files for final assembly. A production video-generation provider can be connected without changing the planning or render contracts.
