#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeckStack } from '../lib/01deck-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('01deck:domainName') ?? 'deck.01ai.ai';
const hostedZoneName = app.node.tryGetContext('01deck:hostedZoneName') ?? '01ai.ai';
const enableDns = app.node.tryGetContext('01deck:enableDns') === true;
const envName = app.node.tryGetContext('01deck:envName') ?? 'prod';

// CDK stack names must start with a letter (StackNameInvalidFormat otherwise) --
// "01Deck-prod" fails that check since it starts with a digit, so the stack ID
// here is "Deck01-<env>" instead. This is purely a CloudFormation/CDK-internal
// identifier, not user-facing branding -- the product name stays 01Deck everywhere
// else (README, resource name prefixes like "01deck/<env>/...", tags, etc.).
new DeckStack(app, `Deck01-${envName}`, {
  domainName,
  hostedZoneName,
  enableDns,
  envName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: '01Deck launch infra: CloudFront/S3 frontend, Fargate/ALB 01Evolve API, RDS Postgres',
});
