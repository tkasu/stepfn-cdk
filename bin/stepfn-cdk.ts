#!/usr/bin/env node
import 'dotenv/config';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StepfnCdkStack } from '../lib/stepfn-cdk-stack';

const stackName = process.env.STACK_NAME;
if (!stackName) {
  throw new Error('STACK_NAME env variable is not defined.')
}

const app = new cdk.App();
new StepfnCdkStack(app, stackName, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});