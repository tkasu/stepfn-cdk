import 'dotenv/config';
import * as sfn from '@aws-sdk/client-sfn';

jest.setTimeout(2 * 60 * 1000);

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

    const describeExecutionCommand = new sfn.DescribeExecutionCommand({
        executionArn: executeResult.executionArn
    });

    let execDescribe: sfn.DescribeExecutionCommandOutput;
    for (let i = 0; i < 10; i++) {
        execDescribe = await client.send(describeExecutionCommand);
        const status = execDescribe.status;
        switch (status) {
            case 'RUNNING':
                break; // continue to the next iteration
            case 'SUCCEEDED':
                return execDescribe;
            default:
                throw new Error(`Invalid exec status: ${status} in ${JSON.stringify(execDescribe)}`);
        }
        await sleep(10 * 1000);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    throw new Error(`Execution taking too long: ${JSON.stringify(execDescribe!)}`);
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
