import request from 'supertest';
import { app } from '../../src/app';

describe('static legal pages', () => {
  it('serves the privacy policy', async () => {
    const res = await request(app).get('/privacy');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Политика конфиденциальности');
  });

  it('serves the terms of service', async () => {
    const res = await request(app).get('/terms');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Условия использования');
  });
});
