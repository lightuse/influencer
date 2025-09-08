import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { InfluencerController } from '@presentation/influencer.controller.js';
import { createInfluencerRoutes } from '@presentation/routes/influencer.routes.js';

// InfluencerControllerのモック
const mockController: InfluencerController = {
  getHealth: vi.fn((req, res) => res.status(200).send('OK')),
  getInfluencerStats: vi.fn((req, res) =>
    res.status(200).json({ influencer_id: req.params.influencerId })
  ),
  getTopInfluencersByLikes: vi.fn((req, res) =>
    res.status(200).json({ limit: req.query.limit })
  ),
  getTopInfluencersByComments: vi.fn((req, res) =>
    res.status(200).json({ limit: req.query.limit })
  ),
  getTopNouns: vi.fn((req, res) =>
    res
      .status(200)
      .json({ influencer_id: req.params.influencerId, limit: req.query.limit })
  ),
} as any;

// Expressアプリとルーティングのセットアップ
const app = express();
app.use('/influencers', createInfluencerRoutes(mockController));

// ルーティングのテスト
describe('Influencer Routes', () => {
  // /influencers/healthでgetHealthが呼ばれること
  it('GET /influencers/health should call getHealth', async () => {
    const response = await request(app).get('/influencers/health');
    expect(response.status).toBe(200);
    expect(mockController.getHealth).toHaveBeenCalled();
  });

  // /influencers/influencer/:influencerId/statsでgetInfluencerStatsが呼ばれること
  it('GET /influencers/:influencerId/stats should call getInfluencerStats', async () => {
    const response = await request(app).get('/influencers/123/stats');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ influencer_id: '123' });
    expect(mockController.getInfluencerStats).toHaveBeenCalled();
  });

  it('GET /influencers/top/likes should call getTopInfluencersByLikes', async () => {
    const response = await request(app).get('/influencers/top/likes?limit=10');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ limit: '10' });
    expect(mockController.getTopInfluencersByLikes).toHaveBeenCalled();
  });

  it('GET /influencers/top/comments should call getTopInfluencersByComments', async () => {
    const response = await request(app).get(
      '/influencers/top/comments?limit=5'
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ limit: '5' });
    expect(mockController.getTopInfluencersByComments).toHaveBeenCalled();
  });

  it('GET /influencers/:influencerId/nouns should call getTopNouns', async () => {
    const response = await request(app).get('/influencers/456/nouns?limit=15');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ influencer_id: '456', limit: '15' });
    expect(mockController.getTopNouns).toHaveBeenCalled();
  });
});
