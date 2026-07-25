export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {} }),
    });
    const json = (await res.json()) as { data?: { status: string; message?: string; details?: unknown } };
    const ticket = json?.data;
    if (ticket?.status === 'error') {
      console.error('Expo push ticket error', ticket.message, ticket.details);
    } else {
      console.log(`Push sent to ${token.slice(0, 24)}... "${title}: ${body}" -> ticket ${ticket?.status}`);
    }
  } catch (err) {
    console.error('Failed to send push notification', err);
  }
}
