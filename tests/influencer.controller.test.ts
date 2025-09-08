import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { InfluencerController } from '../src/presentation/influencer.controller.js';
import { Request, Response } from 'express';

// 型参照用のみimport（import typeで副作用なし）
import type { InfluencerService } from '../src/application/influencer.service.js';
// InfluencerServiceをモック化
vi.mock('@application/influencer.service');

// InfluencerControllerの単体テスト
describe('InfluencerController', () => {
  let influencerService: Partial<InfluencerService>;
  let influencerController: InfluencerController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // 各テストごとにモックとコントローラを初期化
    influencerService = {
      getInfluencerStats: vi.fn() as Mock,
      getTopInfluencersByLikes: vi.fn() as Mock,
      getTopInfluencersByComments: vi.fn() as Mock,
      getTopNouns: vi.fn() as Mock,
    };
    influencerController = new InfluencerController(
      influencerService as InfluencerService
    );

    req = {
      params: {},
      query: {},
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  // getInfluencerStatsのテスト
  describe('getInfluencerStats', () => {
    // 有効なinfluencer IDで統計が返ること
    it('should return stats for a valid influencer ID', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      const stats = {
        influencerId: 1,
        avgLikes: 100,
        avgComments: 20,
        postCount: 5,
      };
      (influencerService.getInfluencerStats as Mock).mockResolvedValue(stats);

      // Act
      await influencerController.getInfluencerStats(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        influencer_id: 1,
        avg_likes: 100,
        avg_comments: 20,
        post_count: 5,
      });
    });

    // 無効なinfluencer IDで400が返ること
    it('should return 400 for an invalid influencer ID', async () => {
      // Arrange
      req.params = { influencerId: 'abc' };

      // Act
      await influencerController.getInfluencerStats(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid influencer ID',
        details: 'influencer ID must be a valid number',
      });
    });

    it('should return 404 if influencer not found', async () => {
      // Arrange
      req.params = { influencerId: '999' };
      (influencerService.getInfluencerStats as Mock).mockResolvedValue(null);

      // Act
      await influencerController.getInfluencerStats(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Influencer not found',
        details: 'No data found for influencer ID: 999',
      });
    });

    it('should return 500 on service error', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      const error = new Error('Database error');
      (influencerService.getInfluencerStats as Mock).mockRejectedValue(error);

      // Act
      await influencerController.getInfluencerStats(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Database error',
      });
    });

    it('should return 500 with "Unknown error" on non-Error service error', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      const nonError = 'Just a string error';
      (influencerService.getInfluencerStats as Mock).mockRejectedValue(
        nonError
      );

      // Act
      await influencerController.getInfluencerStats(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Unknown error',
      });
    });
  });

  describe('getTopInfluencersByLikes', () => {
    it('should return top influencers by likes', async () => {
      // Arrange
      req.query = { limit: '5' };
      const topInfluencers = [
        { influencerId: 1, avgLikes: 1000, postCount: 10 },
        { influencerId: 2, avgLikes: 900, postCount: 8 },
      ];
      (influencerService.getTopInfluencersByLikes as Mock).mockResolvedValue(
        topInfluencers
      );

      // Act
      await influencerController.getTopInfluencersByLikes(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        limit: 5,
        results: [
          { influencer_id: 1, avg_likes: 1000, post_count: 10 },
          { influencer_id: 2, avg_likes: 900, post_count: 8 },
        ],
      });
    });

    it('should return 400 for an invalid limit', async () => {
      req.query = { limit: '200' };

      await influencerController.getTopInfluencersByLikes(
        req as Request,
        res as Response
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 100',
      });
    });

    it('should return 500 on service error', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      const error = new Error('Service error');
      (influencerService.getTopInfluencersByLikes as Mock).mockRejectedValue(
        error
      );

      // Act
      await influencerController.getTopInfluencersByLikes(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service error',
      });
    });

    it('should return 500 with "Unknown error" on non-Error service error', async () => {
      // Arrange
      const nonError = 'Just a string error';
      (influencerService.getTopInfluencersByLikes as Mock).mockRejectedValue(
        nonError
      );

      // Act
      await influencerController.getTopInfluencersByLikes(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Unknown error',
      });
    });

    it('should use default limit if not provided', async () => {
      // Arrange
      const topInfluencers = [
        { influencerId: 1, avgLikes: 1000, postCount: 10 },
        { influencerId: 2, avgLikes: 900, postCount: 8 },
      ];
      (influencerService.getTopInfluencersByLikes as Mock).mockResolvedValue(
        topInfluencers
      );

      // Act
      await influencerController.getTopInfluencersByLikes(
        req as Request,
        res as Response
      );

      // Assert
      expect(influencerService.getTopInfluencersByLikes).toHaveBeenCalledWith(
        10
      );
      expect(res.json).toHaveBeenCalledWith({
        limit: 10,
        results: [
          { influencer_id: 1, avg_likes: 1000, post_count: 10 },
          { influencer_id: 2, avg_likes: 900, post_count: 8 },
        ],
      });
    });
  });

  describe('getTopInfluencersByComments', () => {
    it('should return top influencers by comments', async () => {
      // Arrange
      req.query = { limit: '3' };
      const topInfluencers = [
        { influencerId: 3, avgComments: 50, postCount: 12 },
        { influencerId: 4, avgComments: 45, postCount: 7 },
      ];
      (influencerService.getTopInfluencersByComments as Mock).mockResolvedValue(
        topInfluencers
      );

      // Act
      await influencerController.getTopInfluencersByComments(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        limit: 3,
        results: [
          { influencer_id: 3, avg_comments: 50, post_count: 12 },
          { influencer_id: 4, avg_comments: 45, post_count: 7 },
        ],
      });
    });

    it('should return 400 for an invalid limit', async () => {
      // Arrange
      req.query = { limit: '0' };

      // Act
      await influencerController.getTopInfluencersByComments(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 100',
      });
    });

    it('should return 500 on service error', async () => {
      const error = new Error('Service error');
      (influencerService.getTopInfluencersByComments as Mock).mockRejectedValue(
        error
      );

      await influencerController.getTopInfluencersByComments(
        req as Request,
        res as Response
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service error',
      });
    });

    it('should return 500 with "Unknown error" on non-Error service error', async () => {
      // Arrange
      const nonError = 'Just a string error';
      (influencerService.getTopInfluencersByComments as Mock).mockRejectedValue(
        nonError
      );

      // Act
      await influencerController.getTopInfluencersByComments(
        req as Request,
        res as Response
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Unknown error',
      });
    });

    it('should use default limit if not provided', async () => {
      // Arrange
      const topInfluencers = [
        { influencerId: 3, avgComments: 50, postCount: 12 },
        { influencerId: 4, avgComments: 45, postCount: 7 },
      ];
      (influencerService.getTopInfluencersByComments as Mock).mockResolvedValue(
        topInfluencers
      );

      // Act
      await influencerController.getTopInfluencersByComments(
        req as Request,
        res as Response
      );

      // Assert
      expect(
        influencerService.getTopInfluencersByComments
      ).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        limit: 10,
        results: [
          { influencer_id: 3, avg_comments: 50, post_count: 12 },
          { influencer_id: 4, avg_comments: 45, post_count: 7 },
        ],
      });
    });
  });

  describe('getTopNouns', () => {
    it('should return top nouns for an influencer', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      req.query = { limit: '5' };
      const topNouns = {
        influencerId: 1,
        totalPosts: 10,
        nouns: [
          { noun: 'test', count: 5 },
          { noun: 'sample', count: 3 },
        ],
      };
      (influencerService.getTopNouns as Mock).mockResolvedValue(topNouns);

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        influencer_id: 1,
        total_posts: 10,
        nouns: [
          { noun: 'test', count: 5 },
          { noun: 'sample', count: 3 },
        ],
      });
    });

    it('should return 400 for an invalid influencer ID', async () => {
      // Arrange
      req.params = { influencerId: 'abc' };
      req.query = { limit: '5' };

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid influencer ID',
        details: 'influencer ID must be a valid number',
      });
    });

    it('should return 400 for an invalid limit', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      req.query = { limit: '200' };

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter',
        details: 'Limit must be between 1 and 100',
      });
    });

    it('should return 500 on service error', async () => {
      req.params = { influencerId: '1' };
      req.query = { limit: '5' };
      const error = new Error('Service error');
      (influencerService.getTopNouns as Mock).mockRejectedValue(error);

      await influencerController.getTopNouns(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service error',
      });
    });

    it('should return 500 with "Unknown error" on non-Error service error', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      req.query = { limit: '5' };
      const nonError = 'Just a string error';
      (influencerService.getTopNouns as Mock).mockRejectedValue(nonError);

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Unknown error',
      });
    });

    it('should use default limit if not provided', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      const topNouns = {
        influencerId: 1,
        totalPosts: 10,
        nouns: [
          { noun: 'test', count: 5 },
          { noun: 'sample', count: 3 },
        ],
      };
      (influencerService.getTopNouns as Mock).mockResolvedValue(topNouns);

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(influencerService.getTopNouns).toHaveBeenCalledWith(1, 10);
      expect(res.json).toHaveBeenCalledWith({
        influencer_id: 1,
        total_posts: 10,
        nouns: [
          { noun: 'test', count: 5 },
          { noun: 'sample', count: 3 },
        ],
      });
    });

    it('should return empty nouns array if no nouns found', async () => {
      // Arrange
      req.params = { influencerId: '1' };
      req.query = { limit: '5' };
      const topNouns = {
        influencerId: 1,
        totalPosts: 0,
        nouns: [],
      };
      (influencerService.getTopNouns as Mock).mockResolvedValue(topNouns);

      // Act
      await influencerController.getTopNouns(req as Request, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        influencer_id: 1,
        total_posts: 0,
        nouns: [],
      });
    });

    it('should return 404 if influencer not found for nouns', async () => {
      req.params = { influencerId: '999' };
      req.query = { limit: '5' };
      (influencerService.getTopNouns as Mock).mockResolvedValue(null);

      await influencerController.getTopNouns(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Influencer not found',
        details: 'No data found for influencer ID: 999',
      });
    });
  });
});
