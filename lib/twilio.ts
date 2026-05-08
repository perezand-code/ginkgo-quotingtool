import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn("Twilio environment variables are missing.");
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSms({
  to,
  body,
  statusCallback,
}: {
  to: string;
  body: string;
  statusCallback?: string;
}) {
  if (!client || !fromNumber) {
    throw new Error("Twilio is not configured properly.");
  }

  return client.messages.create({
    to,
    from: fromNumber,
    body,
    ...(statusCallback ? { statusCallback } : {}),
  });
}
