import { Router } from 'express';
import { db } from '../db';
import { logError } from '../sentry';

export const webhooksRouter = Router();

// https://www.revenuecat.com/docs/integrations/webhooks -- event.type values
// that mean "entitlement is active right now". CANCELLATION and
// BILLING_ISSUE deliberately aren't here: cancelling just turns off
// auto-renew (still entitled until the paid period actually ends) and a
// billing issue gets a grace period -- both are followed by a real
// EXPIRATION event if the subscription actually lapses.
const PREMIUM_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']);
const DOWNGRADE_EVENT_TYPES = new Set(['EXPIRATION']);

// Not behind requireAuth -- RevenueCat calls this server-to-server with its
// own shared secret (set as the webhook's "Authorization header" value in
// the RC dashboard), not one of our user JWTs.
webhooksRouter.post('/revenuecat', async (req, res) => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'REVENUECAT_WEBHOOK_SECRET is not configured' });
    return;
  }
  if (req.headers.authorization !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const event = req.body?.event as { type?: string; app_user_id?: string } | undefined;
  const type = event?.type;
  const userId = event?.app_user_id;

  // The dashboard's "Send Test Webhook" button uses a fake app_user_id that
  // won't resolve to a real user -- ack it so the dashboard shows success.
  if (type === 'TEST') {
    res.status(200).json({ ok: true });
    return;
  }

  if (!type || !userId) {
    res.status(400).json({ error: 'Malformed webhook payload' });
    return;
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.coupleId) {
      res.status(200).json({ ok: true });
      return;
    }

    if (PREMIUM_EVENT_TYPES.has(type)) {
      await db.couple.update({ where: { id: user.coupleId }, data: { isPremium: true } });
    } else if (DOWNGRADE_EVENT_TYPES.has(type)) {
      await db.couple.update({ where: { id: user.coupleId }, data: { isPremium: false } });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logError('Failed to process RevenueCat webhook', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
