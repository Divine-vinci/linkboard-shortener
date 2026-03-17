import nodemailer from "nodemailer";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function getTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const transport = getTransport();

  if (!transport) {
    logger.warn("email.transport_unconfigured", {
      to,
      subject,
    });
    return { skipped: true };
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });

  return { skipped: false };
}
