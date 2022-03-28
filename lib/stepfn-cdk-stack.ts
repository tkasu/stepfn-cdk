import * as path from 'path';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pylambda from '@aws-cdk/aws-lambda-python-alpha';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class StepfnCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const logGroup = new logs.LogGroup(this, 'StepfnCdkStackLogGroup');

    const upperLambda = new pylambda.PythonFunction(this, 'UpperFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'upper-lambda'),
      environment: { LOG_LEVEL: 'DEBUG' },
    });

    const helloLambda = new pylambda.PythonFunction(this, 'HelloFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'hello-lambda'),
      environment: { LOG_LEVEL: 'DEBUG' },
    });

    const helloJob = new tasks.LambdaInvoke(this, 'HelloJob', {
      lambdaFunction: helloLambda,
      outputPath: '$.Payload',
    });

    const doNothingPass = new sfn.Pass(this, 'DoNothing');

    const defaultNamePass = new sfn.Pass(this, 'SetDefaultName', {
      result: sfn.Result.fromObject({'name': 'unknown'})
    });
    const hasNoNameChoice = new sfn.Choice(this, 'HasNameCheck');
    const hasNoNameCondition = sfn.Condition.isNotPresent("$.name");

    const upperJob = new tasks.LambdaInvoke(this, 'UpperJob', {
      lambdaFunction: upperLambda,
      outputPath: '$.Payload',
    });
    upperJob.addRetry({
      errors: ['NoNameException'],
      maxAttempts: 0,
    });
    upperJob.addRetry({
      errors: ['States.ALL'],
      maxAttempts: 3
    });

    const tempPass = new sfn.Pass(this, 'TempPass', {
      result: sfn.Result.fromObject({'content': 'Simulated quote'})
    });

    const getQuoteLambda = new pylambda.PythonFunction(this, 'QuoteFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'get-quote-lambda'),
      environment: { LOG_LEVEL: 'DEBUG' },
    });

    const getQuoteJob = new tasks.LambdaInvoke(this, 'QuoteJob', {
      lambdaFunction: getQuoteLambda,
      outputPath: '$.Payload',
    });
    getQuoteJob.addRetry({
      errors: ["States.ALL"],
      interval: Duration.seconds(1),
      backoffRate: 3,
      maxAttempts: 5,
    });

    const flattenAndRenameRes = new sfn.Pass(this, 'FlattenOutputs', {
      parameters: {
        "name.$": "$[0].name",
        "quote.$": "$[1].quote",
      }
    });
    const nameBranch = hasNoNameChoice
      .when(hasNoNameCondition, defaultNamePass).otherwise(doNothingPass).afterwards()
      .next(upperJob)

    const parallel = new sfn.Parallel(this, 'ParallelExecution');
    const definition = parallel
      .branch(nameBranch)
      .branch(getQuoteJob)
      .next(flattenAndRenameRes)
      .next(helloJob)

    new sfn.StateMachine(this, 'StateMachine', {
      definition,
      timeout: Duration.minutes(1),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      }
    })
  }
}
