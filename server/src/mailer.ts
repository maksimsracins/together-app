// Transactional email via Resend's HTTP API (no SDK needed). Without
// RESEND_API_KEY -- local dev, tests -- the message is logged instead, so the
// password-reset flow can still be exercised end to end.
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'test') console.log(`[mail] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Together <no-reply@together.app>',
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  }
}
