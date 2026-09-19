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

The prepared Google Cloud target is:

- Project ID: **ai-video-studio-509112**
- Region: **europe-west4**
- Cloud Run service: **ai-video-studio**
- Runtime service account: **ai-video-studio-runtime**
- GitHub repository: **youtubemovieshortsai/sdwdwawefraeg**

The repository contains:

- `.github/workflows/deploy-cloud-run.yml` — secure GitHub Actions deployment.
- `scripts/setup-gcp-cloud-run.sh` — one-time Google Cloud bootstrap for Workload Identity Federation, service accounts and Secret Manager.
- `.gcloudignore` — source deployment exclusions.

### One-time Google Cloud setup

Open Google Cloud Shell while the **ai-video-studio-509112** project is selected, then run the bootstrap script from the repository:

~~~bash
bash scripts/setup-gcp-cloud-run.sh
~~~

The script creates the deployment identity, runtime identity, Secret Manager entries and GitHub OIDC federation. It prints two values that must be added as GitHub Actions repository secrets:

- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`

The existing `OPENAI_API_KEY` and `GEMINI_API_KEY` GitHub secrets are reused; their values are synchronized into Google Secret Manager during deployment.

After that, run **Deploy AI Video Studio to Cloud Run** from GitHub Actions. Pushes to `main` also deploy automatically.

The deployment uses Secret Manager rather than putting API keys in Cloud Run environment variables. Cloud Run's documented recommendation is to keep sensitive values such as API keys in Secret Manager.

### Cloud Run storage note

Cloud Run's writable filesystem is ephemeral/in-memory and is lost when an instance stops. The current application therefore remains a deployment/demo architecture until rendered media and persistent project/job state are moved to durable storage such as Cloud Storage and a database.

For a real public production deployment, also configure:

- durable object storage for rendered MP4/PNG/SRT assets,
- durable database storage for projects/jobs,
- authenticated access and rate limiting,
- provider/API spending limits,
- HTTPS and a custom domain,
- a durable worker/queue architecture for long video generations.

Cloud Run supports source deployment with a Dockerfile, and Google documents Workload Identity Federation for GitHub Actions so deployment can use short-lived credentials instead of a long-lived service-account key.

The codebase is deliberately structured so these infrastructure pieces can be added without changing the creative planning contracts.

## Local deterministic tests

~~~bash
npm test
~~~

The test suite does not require production provider credentials.
