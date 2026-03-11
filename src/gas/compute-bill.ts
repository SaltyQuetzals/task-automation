import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { Bill, Cents } from "../types";
import { Temporal } from "temporal-polyfill";
import { env } from "../env";

// We use IMAP instead of Playwright because TGS has anti-botting
// in place with reCaptcha. So we look at my Gmail inbox instead,
// waiting for a bill to come that way (it's dispatched when the
// statement is created).

const IMAP_CONFIG = {
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
} as const;

const parseBillFromHtml = (html: string): Bill => {
  const amountMatch = html.match(/\$(\d+)\.<sup[^>]*>(\d+)<\/sup>/);
  if (!amountMatch) {
    throw new Error("Could not parse bill amount from TGS email");
  }
  const total = parseFloat(`${amountMatch[1]}.${amountMatch[2]}`);

  const dueDateMatch = html.match(/Due on ([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (!dueDateMatch) {
    throw new Error("Could not parse due date from TGS email");
  }
  const dueDate = new Date(dueDateMatch[1]!).toISOString().split("T")[0]!;

  const totalCents = Math.round(total * 100) as Cents;
  return {
    dueDate: Temporal.PlainDate.from(dueDate),
    totalCents: totalCents,
    splitsCents: {
      Reimbursements: Math.floor(totalCents / 2) as Cents,
      Gas: Math.ceil(totalCents / 2) as Cents,
    },
  };
};

export default async (): Promise<Bill> => {
  const client = new ImapFlow(IMAP_CONFIG);
  await client.connect();

  try {
    await client.mailboxOpen("INBOX");

    const uids = await client.search(
      {
        from: "estatement@texasgasservice.com",
        subject: "E-Statement",
      },
      { uid: true },
    );

    if (!uids || uids.length === 0) {
      throw new Error("No TGS E-Statement emails found in inbox");
    }

    const latestUid = uids[uids.length - 1]!;
    const message = await client.fetchOne(
      String(latestUid),
      { source: true },
      { uid: true },
    );
    if (!message || !message.source) {
      throw new Error("Failed to fetch TGS E-Statement email");
    }
    const parsed = await simpleParser(message.source);

    const html = parsed.html;
    if (!html) {
      throw new Error("TGS E-Statement email has no HTML body");
    }

    return parseBillFromHtml(html);
  } finally {
    await client.logout();
  }
};
