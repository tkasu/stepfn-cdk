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
      environment: { LOG_LEVEL: "DEBUG" },
    });

    const helloLambda = new pylambda.PythonFunction(this, 'HelloFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'hello-lambda'),
      environment: { LOG_LEVEL: "DEBUG" },
    });

    const helloJob = new tasks.LambdaInvoke(this, 'HelloJob', {
      lambdaFunction: helloLambda,
      outputPath: '$.Payload',
    });

    const defaultNamePass = new sfn.Pass(this, 'DefaultName', {
      result: sfn.Result.fromObject({'name': 'uknown'})
    });

    const defaultBranchDefinition = defaultNamePass
      .next(helloJob)

      const upperJob = new tasks.LambdaInvoke(this, 'UpperJob', {
        lambdaFunction: upperLambda,
        outputPath: '$.Payload',
      });
      upperJob.addRetry({
        errors: ["NoNameException"],
        maxAttempts: 0,
      });
      upperJob.addRetry({
        errors: ["States.ALL"],
        maxAttempts: 3
      });
      upperJob.addCatch(
        defaultBranchDefinition,
        { errors: ["NoNameException"] }
      );

    const mainBranchDefinition = upperJob
      .next(helloJob)

    new sfn.StateMachine(this, 'StateMachine', {
      definition: mainBranchDefinition,
      timeout: Duration.minutes(1),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      }
    })

  }
}
