import * as readline from "readline";
import * as crypto from "crypto";

const BASE_URL = "https://api.venmo.com/v1";
const DEVICE_ID = crypto.randomUUID();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const chars: string[] = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", function onData(char: string) {
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(chars.join(""));
      } else if (char === "\x7f") {
        chars.pop();
      } else if (char === "\x03") {
        process.exit();
      } else {
        chars.push(char);
      }
    });
  });
}

async function initialLogin(phoneEmailOrUsername: string, password: string) {
  const response = await fetch(`${BASE_URL}/oauth/access_token`, {
    method: "POST",
    headers: {
      "device-id": DEVICE_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_email_or_username: phoneEmailOrUsername,
      client_id: "1",
      password,
    }),
  });

  if (response.ok) {
    const data = await response.json() as { access_token: string; user: { username: string } };
    return { success: true as const, accessToken: data.access_token, user: data.user };
  }

  if (response.status === 401) {
    const data = await response.json() as { error?: { code: number } };
    const otpSecret = response.headers.get("venmo-otp-secret");
    if (data.error?.code === 81109 && otpSecret) {
      return { success: false as const, requires2FA: true as const, otpSecret };
    }
  }

  const errorText = await response.text();
  throw new Error(`Login failed (${response.status}): ${errorText}`);
}

async function sendOTPViaSMS(otpSecret: string) {
  const response = await fetch(`${BASE_URL}/account/two-factor/token`, {
    method: "POST",
    headers: {
      "device-id": DEVICE_ID,
      "venmo-otp-secret": otpSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ via: "sms" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send OTP (${response.status}): ${text}`);
  }
}

async function verifyOTP(otpSecret: string, otp: string) {
  const response = await fetch(`${BASE_URL}/oauth/access_token?client_id=1`, {
    method: "POST",
    headers: {
      "device-id": DEVICE_ID,
      "venmo-otp-secret": otpSecret,
      "Venmo-Otp": otp,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OTP verification failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string; user: { username: string } };
  return { accessToken: data.access_token, user: data.user };
}

async function main() {
  console.log("Venmo Authentication\n");

  const username = await prompt("Email, phone, or username: ");
  const password = await promptPassword("Password: ");

  process.stdout.write("\nLogging in...");
  const result = await initialLogin(username, password);

  if (result.success) {
    console.log(` done\n`);
    console.log(`Authenticated as: @${result.user?.username}`);
    console.log(`\nAccess Token:\n${result.accessToken}`);
    return;
  }

  console.log(` 2FA required\n`);
  await sendOTPViaSMS(result.otpSecret);
  console.log("SMS code sent.");

  const otp = await prompt("Enter OTP: ");
  const { accessToken, user } = await verifyOTP(result.otpSecret, otp);

  console.log(`\nAuthenticated as: @${user?.username}`);
  console.log(`\nAccess Token:\n${accessToken}`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
