import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  OnModuleDestroy,
  OnModuleInit,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { ChatService } from './chat.service';
import { autoCredits } from './credits';
import { SendMessageDto } from './workspace.dto';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('guest')
export class GuestController implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly chat: ChatService,
    private readonly config: ConfigService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.prisma.conversation
        .deleteMany({ where: { user: { guestExpiresAt: { lt: new Date() } } } })
        .catch(() => {});
    }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  @Get('configuration') async configuration() {
    const plan = await this.prisma.billingPlan.findUnique({
      where: { code: 'GUEST' },
      include: {
        generationPolicies: { where: { bucket: 'AUTO', enabled: true } },
      },
    });
    const policy = plan?.generationPolicies[0];
    return {
      enabled: Boolean(plan?.isActive && policy),
      creditCosts: {
        chat: policy ? autoCredits(policy) : null,
        image_generation: null,
      },
      dailyLimit: policy?.dailyLimit ?? 0,
      monthlyLimit: policy?.monthlyLimit ?? 0,
    };
  }
  @Post('messages') async send(
    @Req() req: Request,
    @Res() res: Response,
    @Body() input: SendMessageDto,
  ) {
    const origins = this.config
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''));
    if (req.headers.origin && !origins.includes(req.headers.origin))
      throw new ForbiddenException('Origin is not allowed.');
    if (
      input.mode !== 'AUTO' ||
      input.modelId ||
      input.regenerateMessageId ||
      input.attachmentIds?.length ||
      (input.feature && input.feature !== 'chat')
    )
      throw new ForbiddenException(
        'Guest access supports Auto text chat only.',
      );
    const plan = await this.prisma.billingPlan.findUnique({
      where: { code: 'GUEST' },
      include: {
        generationPolicies: { where: { bucket: 'AUTO', enabled: true } },
      },
    });
    const policy = plan?.generationPolicies[0];
    if (!plan?.isActive || !policy)
      throw new ServiceUnavailableException(
        'Guest chat is not configured. Sign in to continue.',
      );
    // Network-wide budgets survive clearing cookies; Redis failures fail closed.
    const ip = createHash('sha256')
      .update(req.ip ?? req.socket.remoteAddress ?? 'unknown')
      .digest('hex');
    try {
      const minute = await this.redis.increment(`guest:minute:${ip}`, 60);
      const daily = await this.redis.increment(`guest:day:${ip}`, 86400);
      const monthly = await this.redis.increment(
        `guest:month:${ip}`,
        31 * 86400,
      );
      if (
        minute > policy.ratePerMinute ||
        daily > policy.dailyLimit ||
        monthly > policy.monthlyLimit
      )
        throw new TooManyRequestsException(
          'Guest allowance reached. Sign up to continue and save chats.',
        );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Guest chat is temporarily unavailable.',
      );
    }
    let token = req.headers.cookie?.match(
      /(?:^|;\s*)vrompt_guest=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    let user = token
      ? await this.prisma.user.findUnique({
          where: { guestKey: createHash('sha256').update(token).digest('hex') },
        })
      : null;
    if (
      user &&
      (user.status !== 'ACTIVE' ||
        (user.guestExpiresAt && user.guestExpiresAt <= new Date()))
    )
      throw new ForbiddenException(
        'Guest session expired. Sign up to continue.',
      );
    if (!user) {
      token = randomBytes(32).toString('hex');
      const key = createHash('sha256').update(token).digest('hex');
      user = await this.prisma.user.create({
        data: {
          guestKey: key,
          guestExpiresAt: new Date(Date.now() + 86400000),
          email: `${key}@guest.invalid`,
          username: `guest_${key.slice(0, 24)}`,
        },
      });
      res.cookie('vrompt_guest', token, {
        httpOnly: true,
        secure: this.config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 86400000,
        path: '/',
      });
    }
    const conversation =
      (await this.prisma.conversation.findFirst({
        where: { userId: user.id },
      })) ??
      (await this.prisma.conversation.create({
        data: { userId: user.id, title: 'Temporary chat' },
      }));
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    const emit = (event: unknown) => {
      if (res.destroyed) return;
      if (!res.headersSent)
        res.set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-store',
          'X-Accel-Buffering': 'no',
        });
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    try {
      await this.chat.generate(
        user.id,
        conversation.id,
        { ...input, attachmentIds: [] },
        controller.signal,
        emit,
      );
    } catch (error) {
      if (!res.headersSent)
        res
          .status(error instanceof HttpException ? error.getStatus() : 500)
          .json({
            message:
              error instanceof HttpException
                ? error.message
                : 'Guest generation failed.',
          });
      else
        emit({
          type: 'error',
          message: 'Guest generation failed. Sign up to continue.',
        });
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
  @Post('save')
  @UseGuards(AccessTokenGuard)
  async save(
    @CurrentUser() owner: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.headers.cookie?.match(
      /(?:^|;\s*)vrompt_guest=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    if (!token) return { saved: 0 };
    const guestKey = createHash('sha256').update(token).digest('hex');
    const result = await this.prisma.$transaction(async (tx) => {
      const guest = await tx.user.findUnique({ where: { guestKey } });
      if (!guest) return { saved: 0 };
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${guest.id}::uuid FOR UPDATE`;
      const claimed = await tx.user.updateMany({
        where: {
          id: guest.id,
          status: 'ACTIVE',
          guestExpiresAt: { gt: new Date() },
        },
        data: { status: 'DELETED' },
      });
      if (!claimed.count) return { saved: 0 };
      if (
        await tx.quotaReservation.count({
          where: { userId: guest.id, status: 'RESERVED' },
        })
      )
        throw new ForbiddenException(
          'Wait for the guest response to finish before saving.',
        );
      const moved = await tx.conversation.updateMany({
        where: { userId: guest.id },
        data: { userId: owner.id },
      });
      return { saved: moved.count };
    });
    res.clearCookie('vrompt_guest', { path: '/' });
    return result;
  }
}
