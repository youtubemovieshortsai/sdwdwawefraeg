# AI Video Studio

Production-oriented AI video studio for YouTube videos, Shorts and thumbnails.

## Output formats

- YouTube video: **1920×1080, 16:9**
- YouTube thumbnail: **1280×720, 16:9**
- YouTube Shorts: **1080×1920, 9:16**
- Shorts thumbnail: **1080×1920, 9:16**

## Production flow

The studio supports:

1. OpenAI structured creative planning.
2. Format-aware storyboard generation.
3. OpenAI TTS voiceover generation.
4. Google Veo clip generation through the provider adapter.
5. FFmpeg assembly at the exact output canvas.
6. AI thumbnail generation and exact-size rendering.
7. SRT subtitle sidecars.
8. Persistent local production-job state.
9. Asynchronous production jobs with browser polling and progress feedback.
10. Per-job output directories so simultaneous productions do not overwrite each other.
11. Docker packaging with FFmpeg included.
12. CI checks for tests and configured AI provider credentials.

The application never reports a successful render when a provider fails.

## Environment

Copy .env.example to .env for local development:

~~~bash
cp .env.example .env
npm install
npm start
~~~

Required for the full AI pipeline:

- OPENAI_API_KEY
- GEMINI_API_KEY

Recommended production configuration:

- VIDEO_PROVIDER=google_veo
- VEO_MODEL=veo-3.1-generate-preview
- VEO_RESOLUTION=720p
- OUTPUT_DIR=renders
- JOBS_DIR=jobs

Never commit .env or API keys.

## Docker

The repository includes a production Dockerfile with Node 20 and FFmpeg:

~~~bash
docker build -t ai-video-studio .
docker run --rm -p 3000:8080 \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e VIDEO_PROVIDER=google_veo \
  ai-video-studio
~~~

The container listens on PORT and binds to all interfaces, which makes it suitable for managed container platforms.

## API

- GET /api/health — runtime/provider configuration status without exposing secrets.
- GET /api/formats — supported output formats.
- POST /api/plan — create an AI production plan.
- POST /api/production-jobs — enqueue an asynchronous full production.
- GET /api/production-jobs/:id — poll a production job.
- GET /api/production-jobs — list persisted production jobs.
- POST /api/production-pipeline — synchronous pipeline endpoint for automation.
- POST /api/video/generate — direct provider clip generation.
- GET /api/video/jobs/:id — provider job inspection.
- POST /api/audio/voiceover — direct TTS generation.
- POST /api/projects / GET /api/projects — local project storage.

Generated media is served under /renders.

## Deployment

The application is container-ready for a managed Node/FFmpeg runtime such as Google Cloud Run. Cloud Run can deploy a Node web service from source or a container, but its default writable filesystem is disposable; production media and project data should therefore be copied to or backed by durable object storage/database storage before treating the service as a multi-instance permanent asset store.

For a real public production deployment, configure:

- a container service,
- durable object storage for rendered MP4/PNG/SRT assets,
- durable database storage for projects/jobs,
- authenticated access and rate limiting,
- provider/API spending limits,
- HTTPS and a custom domain.

The codebase is deliberately structured so these infrastructure pieces can be added without changing the creative planning contracts.

## Local deterministic tests

~~~bash
npm test
~~~

The test suite does not require production provider credentials.
