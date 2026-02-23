import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

export const TICKET_CATEGORIES = ['general', 'dispute', 'billing', 'settlement', 'other'] as const;

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: number, data: {
    category: string;
    subject: string;
    message: string;
    relatedCouponId?: number;
  }) {
    if (!data.subject?.trim()) throw new BadRequestException('Subject is required');
    if (!data.message?.trim()) throw new BadRequestException('Message is required');

    const ticket = this.ticketRepo.create({
      userId,
      category: TICKET_CATEGORIES.includes(data.category as any) ? data.category : 'general',
      subject: data.subject.trim().slice(0, 255),
      message: data.message.trim(),
      relatedCouponId: data.relatedCouponId ?? null,
      status: 'open',
    });
    const saved = await this.ticketRepo.save(ticket);

    // Notify all admins by email (fire-and-forget)
    this.emailService.sendAdminNotification({
      subject: `New Support Ticket: ${saved.subject}`,
      message: `A new ${saved.category} support ticket (#${saved.id}) was submitted:\n\n"${saved.message.slice(0, 300)}"\n\nPlease review it in the admin dashboard.`,
      link: `/admin/support`,
    }).catch(() => {});

    return saved;
  }

  async getMyTickets(userId: number) {
    return this.ticketRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
      select: ['id', 'category', 'subject', 'status', 'adminResponse', 'relatedCouponId', 'createdAt', 'updatedAt'],
    });
  }

  async getMyTicket(userId: number, ticketId: number) {
    const t = await this.ticketRepo.findOne({ where: { id: ticketId, userId } });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  // ── Admin methods ──────────────────────────────────────────────────────────

  async adminList(params: { status?: string; page?: number; limit?: number }) {
    const page  = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, params.limit ?? 20);
    const where: Record<string, string> = {};
    if (params.status) where['status'] = params.status;
    const [items, total] = await this.ticketRepo.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async adminResolve(adminId: number, ticketId: number, data: { response: string; status: string }) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.adminResponse = data.response;
    ticket.status = ['open','in_progress','resolved','closed'].includes(data.status) ? data.status : 'resolved';
    ticket.resolvedBy = adminId;
    ticket.resolvedAt = new Date();
    const saved = await this.ticketRepo.save(ticket);

    await this.notificationsService.create({
      userId: ticket.userId,
      type: 'support',
      title: `Support Ticket ${ticket.status === 'resolved' ? 'Resolved' : 'Updated'}`,
      message: `Your ticket "${ticket.subject}" has been updated. ${data.response.slice(0, 120)}`,
      link: '/support',
      icon: 'info',
      sendEmail: false,
    }).catch(() => {});

    return saved;
  }

  async adminGetStats() {
    const [open, in_progress, resolved, closed] = await Promise.all([
      this.ticketRepo.count({ where: { status: 'open' } }),
      this.ticketRepo.count({ where: { status: 'in_progress' } }),
      this.ticketRepo.count({ where: { status: 'resolved' } }),
      this.ticketRepo.count({ where: { status: 'closed' } }),
    ]);
    return { open, in_progress, resolved, closed, total: open + in_progress + resolved + closed };
  }
}
