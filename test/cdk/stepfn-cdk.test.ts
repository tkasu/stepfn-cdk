import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as StepfnCdk from '../../lib/stepfn-cdk-stack';

test('StateMachine Created', () => {
    const app = new cdk.App();

    // WHEN
    const stack = new StepfnCdk.StepfnCdkStack(app, 'MyTestStack');

    // THEN
    const template = Template.fromStack(stack);
    template.hasResource('AWS::StepFunctions::StateMachine', {});
});
