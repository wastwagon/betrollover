import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TipsterRequest } from './entities/tipster-request.entity';
import { Tipster } from '../predictions/entities/tipster.entity';

describe('UsersService.searchUsersForMention', () => {
  let service: UsersService;
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([
      { username: 'alice', displayName: 'Alice', avatar: null },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: { createQueryBuilder: () => qb } },
        { provide: getRepositoryToken(TipsterRequest), useValue: {} },
        { provide: getRepositoryToken(Tipster), useValue: {} },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
    qb.getMany.mockResolvedValue([{ username: 'alice', displayName: 'Alice', avatar: null }]);
  });

  it('returns empty for short query', async () => {
    expect(await service.searchUsersForMention('a')).toEqual([]);
  });

  it('returns mapped users for valid prefix', async () => {
    const rows = await service.searchUsersForMention('al');
    expect(rows).toEqual([{ username: 'alice', displayName: 'Alice', avatar: null }]);
    expect(qb.where).toHaveBeenCalled();
  });
});

describe('UsersService.resolveMentionProfiles', () => {
  let service: UsersService;
  const resolveQb = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: { createQueryBuilder: () => resolveQb },
        },
        { provide: getRepositoryToken(TipsterRequest), useValue: {} },
        { provide: getRepositoryToken(Tipster), useValue: {} },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('returns empty for no usernames', async () => {
    expect(await service.resolveMentionProfiles([])).toEqual({});
    expect(resolveQb.getRawMany).not.toHaveBeenCalled();
  });

  it('maps tipster href and null href for non-tipster', async () => {
    resolveQb.getRawMany.mockResolvedValue([
      { username: 'tipster1', displayName: 'T1', tipsterId: '42' },
      { username: 'fan99', displayName: 'Fan', tipsterId: null },
    ]);
    const profiles = await service.resolveMentionProfiles(['tipster1', 'fan99']);
    expect(profiles.tipster1).toEqual({
      displayName: 'T1',
      href: '/tipsters/tipster1',
    });
    expect(profiles.fan99).toEqual({
      displayName: 'Fan',
      href: null,
    });
  });
});
