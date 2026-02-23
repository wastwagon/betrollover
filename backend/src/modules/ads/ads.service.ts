import * as fs from 'fs';
import * as path from 'path';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AdZone } from './entities/ad-zone.entity';
import { AdCampaign } from './entities/ad-campaign.entity';

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(AdZone)
    private zoneRepo: Repository<AdZone>,
    @InjectRepository(AdCampaign)
    private campaignRepo: Repository<AdCampaign>,
  ) {}

  /** Public: get active ad for zone (or null if none) */
  async getActiveAdForZone(zoneSlug: string): Promise<AdCampaign | null> {
    const zone = await this.zoneRepo.findOne({ where: { slug: zoneSlug, isActive: true } });
    if (!zone) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const campaigns = await this.campaignRepo.find({
      where: {
        zoneId: zone.id,
        status: 'active',
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      order: { id: 'DESC' },
      take: 1,
    });

    const campaign = campaigns[0] ?? null;

    return campaign;
  }

  async recordImpression(campaignId: number): Promise<void> {
    await this.campaignRepo.increment({ id: campaignId }, 'impressions', 1);
  }

  async recordClick(campaignId: number): Promise<void> {
    await this.campaignRepo.increment({ id: campaignId }, 'clicks', 1);
  }

  // Admin
  async adminGetZones(): Promise<AdZone[]> {
    return this.zoneRepo.find({
      order: { id: 'ASC' },
      relations: ['campaigns'],
    });
  }

  async adminGetCampaigns(zoneId?: number): Promise<AdCampaign[]> {
    const qb = this.campaignRepo.createQueryBuilder('c').leftJoinAndSelect('c.zone', 'z').orderBy('c.id', 'DESC');
    if (zoneId) {
      qb.where('c.zone_id = :zoneId', { zoneId });
    }
    return qb.getMany();
  }

  async adminCreateCampaign(data: Partial<AdCampaign>): Promise<AdCampaign> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async adminUpdateCampaign(id: number, data: Partial<AdCampaign>): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    Object.assign(campaign, data);
    return this.campaignRepo.save(campaign);
  }

  async adminDeleteCampaign(id: number): Promise<void> {
    await this.campaignRepo.delete(id);
  }

  /** Upload ad image; returns path like /uploads/ads/ad_1234567890.jpg */
  async uploadAdImage(file: Express.Multer.File): Promise<{ imageUrl: string }> {
    if (!file) throw new BadRequestException('No image was received.');
    const uploadDir = path.join(process.cwd(), 'uploads', 'ads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const ext = file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.gif';
    const filename = `ad_${Date.now()}${ext}`;
    const destPath = path.join(uploadDir, filename);
    const data = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
    if (!data) throw new BadRequestException('No image data was received.');
    fs.writeFileSync(destPath, data);
    return { imageUrl: `/uploads/ads/${filename}` };
  }
}
