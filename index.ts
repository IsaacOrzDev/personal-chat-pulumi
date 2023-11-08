import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as dotenv from 'dotenv';
import * as awsNative from '@pulumi/aws-native';

dotenv.config();

const westProvider = new aws.Provider('west-provider', {
  region: 'us-west-1',
});

const s3Bucket = new aws.s3.Bucket('personal-chat-data', {});

const repo = new aws.ecr.Repository(
  'personal-chat-api',
  {
    name: 'personal-chat-api',
  },
  {
    provider: westProvider,
  }
);

const lambdaRole = new aws.iam.Role('lambdaRole', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
        Effect: 'Allow',
        Sid: '',
      },
    ],
  }),
});

new aws.iam.RolePolicyAttachment('lambdaRolePolicyAttach', {
  role: lambdaRole,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const lambdaFunc = new aws.lambda.Function(
  'lambdaFunc',
  {
    name: 'personal-chat-api',
    packageType: 'Image',
    imageUri: pulumi.interpolate`${repo.repositoryUrl}:latest`,
    role: lambdaRole.arn,
    timeout: 300,
    memorySize: 1024,
    environment: {
      variables: {
        REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ?? '',
        AWS_LWA_INVOKE_MODE: 'RESPONSE_STREAM',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '8000',
      },
    },
  },
  {
    provider: westProvider,
  }
);

const functionUrl = new aws.lambda.FunctionUrl('lambdaFunctionUrl', {
  functionName: lambdaFunc.name,
  authorizationType: 'NONE',
  invokeMode: 'RESPONSE_STREAM',
});
export const streamingUrl = functionUrl.functionUrl;
