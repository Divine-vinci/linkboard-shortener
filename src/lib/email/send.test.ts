// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(() => ({ sendMail })),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

const { sendEmail } = await import("@/lib/email/send");

describe("src/lib/email/send.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with the configured SMTP transport", async () => {
    await sendEmail({
      to: "user@example.com",
      subject: "Reset your password",
      html: "<p>Hello</p>",
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: process.env.SMTP_FROM,
      to: "user@example.com",
      subject: "Reset your password",
      html: "<p>Hello</p>",
    });
  });
});
