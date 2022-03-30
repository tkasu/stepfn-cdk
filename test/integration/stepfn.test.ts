import * as sfn from '@aws-sdk/client-sfn';

const sleep = (ms: number) => (
    new Promise(resolve => setTimeout(resolve, ms))
)

test('Happy path name given', async () => {
    const client = new sfn.SFNClient({});

    // TODO FIX THIS, get output from arn and save to env
    const executeCommand = new sfn.StartExecutionCommand({
        stateMachineArn: "arn:aws:states:eu-west-1:972829804869:stateMachine:StateMachine2E01A3A5-6uIrqBwJjwe9",
        input: JSON.stringify({"name": "TestUser"}),
    });
    const executeResult = await client.send(executeCommand);

    // Wait for stepfunctio exec
    // Replace this with some loop?
    await sleep(3000)

    const describeExecutionCommand = new sfn.DescribeExecutionCommand({
        executionArn: executeResult.executionArn
    });
    const describeResult = await client.send(describeExecutionCommand);
    const output = describeResult.output?.replace('"', '');

    // Hello with uppercased name + some content.
    expect(output).toMatch(new RegExp('^Hello TESTUSER\. .{10,}'));
});
