import * as path from 'path';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as pylambda from '@aws-cdk/aws-lambda-python-alpha';

export class StepfnCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const helloLambda = new pylambda.PythonFunction(this, 'MyFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'hello-lambda'),
      bundling: {
        environment: { LOG_LEVEL: "DEBUG" },
      },
    });

    const helloJob = new tasks.LambdaInvoke(this, 'Hello Job', {
      lambdaFunction: helloLambda,
      outputPath: '$.Payload',
    });
    
    new sfn.StateMachine(this, 'StateMachine', {
      definition: helloJob,
      timeout: Duration.minutes(1),
    })

  }
}
