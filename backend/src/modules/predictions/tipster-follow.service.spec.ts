import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipsterFollowService } from './tipster-follow.service';
import { TipsterFollow } from './entities/tipster-follow.entity';
import { Tipster } from './entities/tipster.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('TipsterFollowService', () => {
  let service: TipsterFollowService;
  let followRepo: jest.Mocked<Partial<Repository<TipsterFollow>>>;
  let tipsterRepo: jest.Mocked<Partial<Repository<Tipster>>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  const mockTipster = {
    id: 1,
    username: 'test_tipster',
    displayName: 'Test Tipster',
    avatarUrl: null,
    userId: 10,
  };

  beforeEach(async () => {
    followRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    tipsterRepo = {
      findOne: jest.fn(),
    };
    notificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsterFollowService,
        { provide: getRepositoryToken(TipsterFollow), useValue: followRepo },
        { provide: getRepositoryToken(Tipster), useValue: tipsterRepo },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<TipsterFollowService>(TipsterFollowService);
    jest.clearAllMocks();
  });

  describe('follow', () => {
    it('should follow a tipster successfully', async () => {
      (tipsterRepo.findOne as jest.Mock).mockResolvedValue(mockTipster);
      (followRepo.findOne as jest.Mock).mockResolvedValue(null);
      (followRepo.save as jest.Mock).mockResolvedValue({});

      const result = await service.follow(5, 'test_tipster');

      expect(result).toEqual({ success: true });
      expect(tipsterRepo.findOne).toHaveBeenCalledWith({ where: { username: 'test_tipster' } });
      expect(followRepo.findOne).toHaveBeenCalledWith({ where: { userId: 5, tipsterId: 1 } });
      expect(followRepo.save).toHaveBeenCalledWith({ userId: 5, tipsterId: 1 });
    });

    it('should throw NotFoundException when tipster does not exist', async () => {
      (tipsterRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.follow(5, 'unknown_tipster')).rejects.toThrow(NotFoundException);
      await expect(service.follow(5, 'unknown_tipster')).rejects.toThrow('Tipster not found');
      expect(followRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when already following', async () => {
      (tipsterRepo.findOne as jest.Mock).mockResolvedValue(mockTipster);
      (followRepo.findOne as jest.Mock).mockResolvedValue({ userId: 5, tipsterId: 1 });

      await expect(service.follow(5, 'test_tipster')).rejects.toThrow(ConflictException);
      await expect(service.follow(5, 'test_tipster')).rejects.toThrow('Already following this tipster');
      expect(followRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('unfollow', () => {
    it('should unfollow a tipster successfully', async () => {
      (tipsterRepo.findOne as jest.Mock).mockResolvedValue(mockTipster);
      (followRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.unfollow(5, 'test_tipster');

      expect(result).toEqual({ success: true });
      expect(followRepo.delete).toHaveBeenCalledWith({ userId: 5, tipsterId: 1 });
    });

    it('should throw NotFoundException when tipster does not exist', async () => {
      (tipsterRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.unfollow(5, 'unknown_tipster')).rejects.toThrow(NotFoundException);
      expect(followRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('isFollowing', () => {
    it('should return true when user follows tipster', async () => {
      (followRepo.findOne as jest.Mock).mockResolvedValue({ userId: 5, tipsterId: 1 });

      const result = await service.isFollowing(5, 1);

      expect(result).toBe(true);
    });

    it('should return false when user does not follow tipster', async () => {
      (followRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.isFollowing(5, 1);

      expect(result).toBe(false);
    });
  });

  describe('getFollowedTipsters', () => {
    it('should return list of followed tipsters', async () => {
      (followRepo.find as jest.Mock).mockResolvedValue([
        {
          tipster: {
            id: 1,
            username: 'tip1',
            displayName: 'Tipster 1',
            avatarUrl: 'https://example.com/av1.jpg',
          },
        },
      ]);

      const result = await service.getFollowedTipsters(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        username: 'tip1',
        displayName: 'Tipster 1',
        avatarUrl: 'https://example.com/av1.jpg',
      });
    });

    it('should return empty array when following none', async () => {
      (followRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getFollowedTipsters(5);

      expect(result).toEqual([]);
    });
  });
});
