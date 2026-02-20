import { Controller, Get, Query, Res, Param, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';

/**
 * Serves avatar images with optional resize.
 * Use ?size=96 to get a resized image (saves bandwidth - AI tipster avatars can be 25MB+).
 * Routes: GET /avatars/resize?path=...&size=96  (path = /avatars/xxx or /uploads/avatars/xxx)
 */
@Controller('avatars')
export class AvatarsController {
  /**
   * Resize and serve avatar. Use for all avatar URLs to avoid loading 25MB+ source files.
   * path: /avatars/safety_first.png or /uploads/avatars/avatar_123.jpg
   */
  @Get('resize')
  async getResized(
    @Query('path') avatarPath: string,
    @Query('size') sizeParam: string,
    @Res() res: Response,
  ) {
    if (!avatarPath || !avatarPath.startsWith('/')) {
      throw new NotFoundException('Invalid avatar path');
    }
    const size = Math.min(256, Math.max(32, parseInt(sizeParam || '96', 10) || 96));
    const baseDir = process.cwd();
    let filePath: string;
    if (avatarPath.startsWith('/uploads/avatars/')) {
      filePath = path.join(baseDir, avatarPath);
    } else if (avatarPath.startsWith('/avatars/')) {
      // AI tipster avatars: try uploads/avatars/ first, then avatars/
      const filename = avatarPath.replace(/^\/avatars\//, '');
      const uploadsPath = path.join(baseDir, 'uploads', 'avatars', filename);
      const avatarsPath = path.join(baseDir, 'avatars', filename);
      filePath = fs.existsSync(uploadsPath) ? uploadsPath : avatarsPath;
    } else {
      throw new NotFoundException('Invalid avatar path');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Avatar not found');
    }
    try {
      const buffer = await sharp(filePath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      res.set({ 'Cache-Control': 'public, max-age=86400', 'Content-Type': 'image/jpeg' });
      res.send(buffer);
    } catch {
      // Fallback: serve original if sharp fails
      const buf = fs.readFileSync(filePath);
      res.set({ 'Cache-Control': 'public, max-age=86400' });
      res.send(buf);
    }
  }
}
