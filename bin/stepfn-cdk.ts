#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StepfnCdkStack } from '../lib/stepfn-cdk-stack';

const app = new cdk.App();
new StepfnCdkStack(app, 'StepfnCdkStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});