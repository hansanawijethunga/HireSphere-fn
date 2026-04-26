import { Amplify } from 'aws-amplify';

const requiredEnv = {
  userPoolId: import.meta.env.VITE_COGNITO_POOL_ID,
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  region: import.meta.env.VITE_AWS_REGION,
};

const missingKeys = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing required Cognito environment configuration: ${missingKeys.join(', ')}`,
  );
}

if (!requiredEnv.userPoolId.startsWith(`${requiredEnv.region}_`)) {
  console.warn(
    'VITE_AWS_REGION does not match the region prefix in VITE_COGNITO_POOL_ID.',
  );
}

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: requiredEnv.userPoolId,
      userPoolClientId: requiredEnv.userPoolClientId,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
    },
  },
};

export const awsRegion = requiredEnv.region;

Amplify.configure(awsConfig);
