#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="ai-video-studio-509112"
REGION="europe-west4"
REPO="youtubemovieshortsai/sdwdwawefraeg"
REPO_ID="1377029733"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-actions"
DEPLOY_SA_ID="ai-video-studio-deployer"
RUNTIME_SA_ID="ai-video-studio-runtime"
DEPLOY_SA="$DEPLOY_SA_ID@$PROJECT_ID.iam.gserviceaccount.com"
RUNTIME_SA="$RUNTIME_SA_ID@$PROJECT_ID.iam.gserviceaccount.com"

echo "Using project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

if ! gcloud iam service-accounts describe "$DEPLOY_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOY_SA_ID" \
    --display-name="AI Video Studio GitHub deployer"
fi

if ! gcloud iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_ID" \
    --display-name="AI Video Studio Cloud Run runtime"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/run.sourceDeveloper" \
  --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --quiet

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

COMPUTE_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/run.builder" \
  --quiet

for secret in openai-api-key gemini-api-key; do
  if ! gcloud secrets describe "$secret" >/dev/null 2>&1; then
    gcloud secrets create "$secret" --replication-policy="automatic"
  fi

  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$DEPLOY_SA" \
    --role="roles/secretmanager.secretVersionManager" \
    --quiet

  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

if ! gcloud iam workload-identity-pools describe "$POOL_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id" \
    --attribute-condition="assertion.repository_id=='$REPO_ID'"
fi

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository_id/$REPO_ID" \
  --quiet

echo
echo "Google Cloud setup is ready."
echo
echo "Add these two GitHub Actions repository secrets:"
echo
echo "WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "WIF_SERVICE_ACCOUNT=$DEPLOY_SA"
echo
echo "Existing OPENAI_API_KEY and GEMINI_API_KEY secrets remain unchanged."
echo "After adding the two WIF secrets, run the 'Deploy AI Video Studio to Cloud Run' workflow."
echo
echo "Region: $REGION"
