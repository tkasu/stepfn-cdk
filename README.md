# Sample AWS Step Function with CDK

This is a project used to experiment and learn how to use AWS Step Functions with/and CDK.

The logic of the app is mostly stupid, the components chosen (e.g. Fargate) does not make sense in most of the cases. They are chosen to experiment how to use different components.

The CDK app contains at least the following cases

* State machine with parallel execution, branching and some retries
* Typescript lambda step with dependencies, built and deployed with CDK
* Python lambda step with dependencies, built and deployed with CDK
* Fargate Step, deployed with CDK (uses ECR created by CDK bootstrap)
* Integration tests for the Step Function

TODO Add step function graph with component icons.

## Installation

`npm install`

## Deployment

1. Create .env file with variable `STACK_NAME`
2. `npx cdk deploy`

## Tests

### Test generated infrastructure

`npm run test-infra`

### Integration tests

Get State Machine ARN for integration test to your .env file:

`npm run sync-env`

Run integration tests:

`run run test-integration`

### Remove deployment

`npx cdk destroy`
