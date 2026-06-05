import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-west-1' })

export async function invokeEmailLambda(sessionId: string): Promise<void> {
  const functionName = process.env.MOCKMATE_EMAIL_LAMBDA_NAME
  if (!functionName) return

  try {
    await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({ sessionId }),
      }),
    )
  } catch (err) {
    console.error('[email-lambda] invocation failed:', err)
  }
}
