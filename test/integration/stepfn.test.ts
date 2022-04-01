import 'dotenv/config';
import * as sfn from '@aws-sdk/client-sfn';

const sleep = (ms: number) => (
    new Promise(resolve => setTimeout(resolve, ms))
)

test('Happy path name given', async () => {
    const client = new sfn.SFNClient({});

    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    if (!stateMachineArn) {
        throw new Error('STATE_MACHINE_ARN is not defined, try "npm run sync-env"')
    }

    const executeCommand = new sfn.StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        input: JSON.stringify({'name': 'TestUser'}),
    });
    const executeResult = await client.send(executeCommand);

    // Wait for stepfunctio exec
    // Replace this with some loop?
    await sleep(3000)

    const describeExecutionCommand = new sfn.DescribeExecutionCommand({
        executionArn: executeResult.executionArn
    });
    const describeResult = await client.send(describeExecutionCommand);

    let output = describeResult.output;
    if (!output) {
        throw new Error(`No output in ${JSON.stringify(describeResult)}.`);
    }
    output = JSON.parse(output);

    // Hello with uppercased name + some content.
    expect(output).toMatch(new RegExp('^Hello TESTUSER. .{10,}'));
});
