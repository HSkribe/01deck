#!/usr/bin/env bash
set -euo pipefail

# Deploys the built 01Deck frontend to the live AWS stack (Deck01-prod):
# builds, syncs dist/ to the CloudFront-fronted S3 bucket, then invalidates
# the cache so the new build is served immediately. cdk deploy (run from
# infra/aws-cdk) is a separate step and only needed for backend/infra
# changes -- this script never touches ECS/RDS.
#
# Usage: ./scripts/deploy_frontend_aws.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

BUCKET_NAME="$(aws cloudformation describe-stacks --stack-name Deck01-prod \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)"
CLOUDFRONT_DOMAIN="$(aws cloudformation describe-stacks --stack-name Deck01-prod \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text)"
DISTRIBUTION_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?DomainName=='${CLOUDFRONT_DOMAIN}'].Id" --output text)"

if [ -z "${BUCKET_NAME}" ] || [ -z "${DISTRIBUTION_ID}" ]; then
  echo "Could not resolve the frontend bucket or CloudFront distribution from the Deck01-prod stack outputs." >&2
  exit 1
fi

echo "Building deck frontend..."
npm run build:deck

echo "Syncing dist/ to s3://${BUCKET_NAME}..."
aws s3 sync dist/ "s3://${BUCKET_NAME}/" --delete

echo "Invalidating CloudFront distribution ${DISTRIBUTION_ID}..."
INVALIDATION_ID="$(aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" --query "Invalidation.Id" --output text)"

echo "Waiting for invalidation ${INVALIDATION_ID} to complete..."
aws cloudfront wait invalidation-completed --distribution-id "${DISTRIBUTION_ID}" --id "${INVALIDATION_ID}"

echo "Frontend deployed: https://${CLOUDFRONT_DOMAIN}"
