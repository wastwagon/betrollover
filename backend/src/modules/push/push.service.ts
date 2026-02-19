import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webPush from 'web-push';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PushDevice } from './entities/push-device.entity';

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
  icon?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidPublicKey: string | null = null;
  private expo: Expo | null = null;

  constructor(
    @InjectRepository(PushDevice)
    private readonly deviceRepo: Repository<PushDevice>,
    private readonly config: ConfigService,
  ) {
    const vapidPublic = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = this.config.get<string>('VAPID_PRIVATE_KEY');
    if (vapidPublic && vapidPrivate) {
      this.vapidPublicKey = vapidPublic;
      webPush.setVapidDetails(
        'mailto:support@betrollover.com',
        vapidPublic,
        vapidPrivate,
      );
    }
    this.expo = new Expo();
  }

  getVapidPublicKey(): string | null {
    return this.vapidPublicKey;
  }

  async register(userId: number, platform: string, token: string, deviceName?: string) {
    const existing = await this.deviceRepo.findOne({
      where: { userId, platform, token },
    });
    if (existing) {
      existing.lastUsedAt = new Date();
      existing.deviceName = deviceName ?? existing.deviceName;
      await this.deviceRepo.save(existing);
      return { id: existing.id };
    }
    const device = this.deviceRepo.create({
      userId,
      platform,
      token,
      deviceName: deviceName ?? null,
      lastUsedAt: new Date(),
    });
    await this.deviceRepo.save(device);
    return { id: device.id };
  }

  async unregister(userId: number, token: string) {
    await this.deviceRepo.delete({ userId, token });
    return { ok: true };
  }

  async sendToUser(userId: number, payload: PushPayload): Promise<void> {
    const devices = await this.deviceRepo.find({ where: { userId } });
    if (devices.length === 0) return;

    for (const device of devices) {
      try {
        if (device.platform === 'web') {
          await this.sendWebPush(device.token, payload);
        } else if (device.platform === 'ios' || device.platform === 'android') {
          await this.sendExpoPush(device.token, payload);
        }
        device.lastUsedAt = new Date();
        await this.deviceRepo.save(device);
      } catch (err: unknown) {
        this.logger.warn(`Push failed for device ${device.id}: ${err instanceof Error ? err.message : String(err)}`);
        if (err instanceof Error && (err.message?.includes('410') || err.message?.includes('404'))) {
          await this.deviceRepo.remove(device);
        }
      }
    }
  }

  private async sendWebPush(subscriptionJson: string, payload: PushPayload): Promise<void> {
    if (!this.vapidPublicKey) return;
    let sub: webPush.PushSubscription;
    try {
      sub = JSON.parse(subscriptionJson);
    } catch {
      return;
    }
    await webPush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? '/favicon.svg',
        url: payload.link,
      }),
      { TTL: 86400 },
    );
  }

  private async sendExpoPush(expoPushToken: string, payload: PushPayload): Promise<void> {
    if (!this.expo || !Expo.isExpoPushToken(expoPushToken)) return;
    const message: ExpoPushMessage = {
      to: expoPushToken,
      title: payload.title,
      body: payload.body,
      data: payload.link ? { url: payload.link } : undefined,
      sound: 'default',
    };
    const chunks = this.expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await this.expo.sendPushNotificationsAsync(chunk);
    }
  }
}
