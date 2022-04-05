import * as path from 'path';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecrassets from 'aws-cdk-lib/aws-ecr-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as nodelambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as pylambda from '@aws-cdk/aws-lambda-python-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class StepfnCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Base infra
    const logGroup = new logs.LogGroup(this, 'StepfnCdkStackLogGroup');
    const resBucket = new s3.Bucket(this, 'ResBucket');

    // Lambdas
    const upperLambda = new nodelambda.NodejsFunction(this, 'UpperFunction', {
      entry: path.join(__dirname, '..', 'lambda', 'upper-lambda', 'index.ts'),
      environment: { LOG_LEVEL: 'DEBUG' },
    });

    const helloLambda = new pylambda.PythonFunction(this, 'HelloFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      index: 'handler.py',
      entry: path.join(__dirname, '..', 'lambda', 'hello-lambda'),
      environment: { LOG_LEVEL: 'DEBUG' },
    });

    // ECS Tasks
    const getQuoteImage = new ecrassets.DockerImageAsset(this, 'GetQuoteImage', {
      directory: path.join(__dirname, '..', 'containers', 'get-quote'),
    });
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,  // As this is for experimenting
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        }
      ]
    });
    const fargateCluster = new ecs.Cluster(this, 'FargateCluster', { vpc });
    const quoteFargateTask = new ecs.TaskDefinition(this, 'QuoteFargateTask', {
      memoryMiB: '512',
      cpu: '256',
      compatibility: ecs.Compatibility.FARGATE,
    });
    const quoteContainer = quoteFargateTask.addContainer('QuoteContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(getQuoteImage),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'cdk-statemachine',
      }),
      memoryLimitMiB: 256,
    });
    resBucket.grantWrite(quoteFargateTask.taskRole);

    // Step function constructs
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
      errors: ['NoNameError'],
      maxAttempts: 0,
    });
    upperJob.addRetry({
      errors: ['States.ALL'],
      maxAttempts: 3
    });

    const sfnExecId = sfn.JsonPath.stringAt('$$.Execution.Id');
    const quoteS3Key = sfn.JsonPath.format('quote/{}', sfnExecId);

    const getQuoteJob = new tasks.EcsRunTask(this, 'QuoteJob', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      timeout: Duration.minutes(2),
      cluster: fargateCluster,
      taskDefinition: quoteFargateTask,
      assignPublicIp: false,
      containerOverrides: [{
        containerDefinition: quoteContainer,
        environment: [
          { name: 'LOG_LEVEL', value: 'DEBUG' },
          { name: 'S3_BUCKET', value: resBucket.bucketName },
          { name: 'S3_KEY', value:  quoteS3Key }
        ]
      }],
      launchTarget: new tasks.EcsFargateLaunchTarget(),
    });
    getQuoteJob.addRetry({
      errors: ["States.ALL"],
      interval: Duration.seconds(1),
      backoffRate: 3,
      maxAttempts: 5,
    });

    const getQuoteObj = new tasks.CallAwsService(this, 'GetQuoteObj', {
      service: 's3',
      action: 'getObject',
      parameters: {
        Bucket: resBucket.bucketName,
        Key: quoteS3Key
      },
      iamResources: [resBucket.arnForObjects('*')],
    });

    const parseS3ObjBody = new sfn.Pass(this, 'GetS3ObjBody', {
      parameters: {
        body: sfn.JsonPath.stringToJson(sfn.JsonPath.stringAt("$.Body"))
      },
    });

    const flattenAndRenameRes = new sfn.Pass(this, 'FlattenOutputs', {
      parameters: {
        "name.$": "$[0].name",
        "quote.$": "$[1].body.quote",
      }
    });

    // Step Function flow
    const nameBranch = hasNoNameChoice
      .when(hasNoNameCondition, defaultNamePass).otherwise(doNothingPass).afterwards()
      .next(upperJob)

    const getQuoteBranch = getQuoteJob
      .next(getQuoteObj)
      .next(parseS3ObjBody)

    const parallel = new sfn.Parallel(this, 'ParallelExecution');
    const definition = parallel
      .branch(nameBranch)
      .branch(getQuoteBranch)
      .next(flattenAndRenameRes)
      .next(helloJob)

    // State machine
    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition,
      timeout: Duration.minutes(3),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      }
    });

    // Stack outputs
    const stateMachineArnOutputName = process.env.STATE_MACHINE_ARN_OUTPUT_NAME;
    if (!stateMachineArnOutputName) {
      throw new Error('STATE_MACHINE_ARN_OUTPUT_NAME env variable is not defined.')
    }

    new CfnOutput(this, 'StateMachineArnOutput', {
      value: stateMachine.stateMachineArn,
      exportName: stateMachineArnOutputName,
    });
  }
}
