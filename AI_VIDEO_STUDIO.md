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
