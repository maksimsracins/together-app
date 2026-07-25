import { Router } from 'express';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { serializeNotification } from '../serializers';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthedRequest, res) => {
  const notifications = await db.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications.map(serializeNotification));
});

notificationsRouter.post('/read-all', async (req: AuthedRequest, res) => {
  await db.notification.updateMany({
    where: { userId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.status(204).send();
});

notificationsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const notification = await db.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.userId) {
    res.status(404).json({ error: 'Уведомление не найдено' });
    return;
  }
  await db.notification.delete({ where: { id: notification.id } });
  res.status(204).send();
});
