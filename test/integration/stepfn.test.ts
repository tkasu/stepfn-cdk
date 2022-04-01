import 'dotenv/config';
import * as sfn from '@aws-sdk/client-sfn';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getSfnResultOutput(res: sfn.DescribeExecutionCommandOutput): string {
    const output = res.output;
    if (!output) {
        throw new Error(`No output in ${JSON.stringify(res)}.`);
    }
    return JSON.parse(output);
}

async function execAndGetSfnResult(input: string) {
    const client = new sfn.SFNClient({});

    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    if (!stateMachineArn) {
        throw new Error('STATE_MACHINE_ARN is not defined, try "npm run sync-env"')
    }

    const executeCommand = new sfn.StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        input: input,
    });
    const executeResult = await client.send(executeCommand);

    // Wait for stepfunctio exec
    // Replace this with some loop?
    await sleep(3000)

    const describeExecutionCommand = new sfn.DescribeExecutionCommand({
        executionArn: executeResult.executionArn
    });
    return await client.send(describeExecutionCommand);
}

test('Happy path name given', async () => {
    const sfnExecResult = await execAndGetSfnResult(JSON.stringify({'name': 'TestUser'}));
    const output = getSfnResultOutput(sfnExecResult);
    // Hello with uppercased name + some content.
    expect(output).toMatch(new RegExp('^Hello TESTUSER. .{10,}'));
});

test('Happy path no name given', async () => {
    const sfnExecResult = await execAndGetSfnResult(JSON.stringify({'something': 'else'}));
    const output = getSfnResultOutput(sfnExecResult);
    // Hello with default name + some content.
    expect(output).toMatch(new RegExp('^Hello UNKNOWN. .{10,}'));
});
