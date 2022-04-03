#!/usr/bin/env node
import 'dotenv/config';
import * as updateDotenv from 'update-dotenv';
import * as cfn from '@aws-sdk/client-cloudformation';

const state_machine_arn_output_name = process.env.STATE_MACHINE_ARN_OUTPUT_NAME;
if (!state_machine_arn_output_name) {
    throw new Error('STATE_MACHINE_ARN_OUTPUT_NAME env variable is not defined.');
}
const stackName = process.env.STACK_NAME;
if (!stackName) {
    throw new Error('STACK_NAME env variable is not defined.')
}

interface OutputConfig {
    exportName: string,
    envOutputName: string,
}
const OUTPUTS_TO_UPDATE: OutputConfig[] = [
    {
        exportName: state_machine_arn_output_name,
        envOutputName: 'STATE_MACHINE_ARN',
    }
];

const dotenvUpdatePropsFactory = (propName: string, propValue: string) => {
    return {
        [propName]: propValue
    }
};

const fetchStackOutputs = async () => {
    const cfnClient = new cfn.CloudFormationClient({});

    const describeStackCommand = new cfn.DescribeStacksCommand({
        StackName: stackName
    });
    const result = await cfnClient.send(describeStackCommand);

    const stacks = result.Stacks;
    if (!stacks) {
        throw new Error(`No stacks found with name ${stackName}`);
    }

    const outputs = stacks[0].Outputs;
    if (!outputs) {
        throw new Error(`No outputs for stack ${stackName}`);
    }
    return outputs
}

const updateEnv = async () => {
    const outputs = await fetchStackOutputs();

    const outputsToUpdate = outputs.filter((output) => {
        const exportName = output.ExportName
        switch (exportName) {
            case undefined:
                return false;
            default:
                return OUTPUTS_TO_UPDATE.map((config) => config.exportName).includes(exportName);
        }
    });
    console.log(`Found outputs: ${JSON.stringify(outputsToUpdate)}`);

    for (const output of outputsToUpdate) {
        const exportName = output.ExportName;
        // making typescript happy, cheked beforehand
        if (!exportName) {
            throw new Error(`No ExportName for output ${JSON.stringify(output)}`)
        }

        const outputValue = output.OutputValue;
        if (!outputValue) {
            throw new Error(`No OutputValue for output ${JSON.stringify(output)}`)
        }

        const outputConfigs = OUTPUTS_TO_UPDATE.filter((config) => config.exportName === exportName);
        if (outputConfigs.length === 0) {
            throw new Error(`Unexpected error, ${JSON.stringify(output)} not in ${JSON.stringify(OUTPUTS_TO_UPDATE)}`);
        }

        const envVarName = outputConfigs[0].envOutputName;
        const updateProps = dotenvUpdatePropsFactory(envVarName, outputValue);
        await updateDotenv(updateProps);
    }
};

updateEnv().then(
    () => console.log(".env updated!"),
    err => { throw err; }
);
