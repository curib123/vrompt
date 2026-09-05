import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { QuotaService } from './quota.service';
import { AttachmentService } from './attachment.service';
import { ModelRegistryService } from './registry.service';
import {
  ConversationDto,
  SavedPromptDto,
  SendMessageDto,
} from './workspace.dto';

@Controller('workspace')
@UseGuards(AccessTokenGuard)
export class WorkspaceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly quota: QuotaService,
    private readonly files: AttachmentService,
  ) {}
  @Get('models') models(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.models(user.id);
  }
  @Get('usage') usage(@CurrentUser() user: AuthenticatedUser) {
    return this.quota.usage(user.id);
  }
  @Get('conversations') conversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q = '',
  ) {
    return this.prisma.conversation.findMany({
      where: {
        userId: user.id,
        archived: false,
        ...(q
          ? {
              title: {
                contains: q.slice(0, 160),
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }
  @Post('conversations') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ConversationDto,
  ) {
    return this.prisma.conversation.create({
      data: { userId: user.id, title: input.title },
    });
  }
  @Get('conversations/:id') async conversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const conversation = await this.chat.owned(user.id, id);
    return {
      ...conversation,
      messages: await this.prisma.message.findMany({
        where: { conversationId: id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      attachments: await this.prisma.attachment.findMany({
        where: { conversationId: id, generated: false },
        select: { id: true, name: true, size: true, mimeType: true },
      }),
    };
  }
  @Patch('conversations/:id') async rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ConversationDto,
  ) {
    await this.chat.owned(user.id, id);
    return this.prisma.conversation.update({ where: { id }, data: input });
  }
  @Delete('conversations/:id') async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.chat.owned(user.id, id);
    const files = await this.prisma.attachment.findMany({
      where: { conversationId: id, userId: user.id },
    });
    for (const file of files) await this.files.remove(user.id, file.id);
    await this.prisma.conversation.deleteMany({
      where: { id, userId: user.id },
    });
    return { deleted: true };
  }
  @Post('conversations/:id/messages') async send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SendMessageDto,
    @Res() res: Response,
  ) {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    const emit = (event: unknown) => {
      if (res.destroyed) return;
      if (!res.headersSent)
        res.status(200).set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        });
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    try {
      await this.chat.generate(user.id, id, input, abort.signal, emit);
    } catch (error) {
      if (!res.headersSent) {
        res
          .status(error instanceof HttpException ? error.getStatus() : 500)
          .json({
            message:
              error instanceof HttpException
                ? error.message
                : 'Request could not be completed.',
          });
        return;
      }
      emit({
        type: 'error',
        message: 'Request could not be completed. Reload your conversation.',
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
  @Post('conversations/:id/files')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20_000_000, files: 1 } }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.files.upload(user.id, id, file);
  }
  @Get('files/:id') async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { file, data } = await this.files.read(user.id, id);
    res
      .set({
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Cache-Control': 'private, no-store',
      })
      .send(data);
  }
  @Delete('files/:id') deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.files.remove(user.id, id);
  }
  @Get('saved-prompts') prompts(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.savedPrompt.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }
  @Post('saved-prompts') savePrompt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SavedPromptDto,
  ) {
    return this.prisma.savedPrompt.create({
      data: { ...input, userId: user.id },
    });
  }
  @Patch('saved-prompts/:id') editPrompt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SavedPromptDto,
  ) {
    return this.prisma.savedPrompt.updateMany({
      where: { id, userId: user.id },
      data: input,
    });
  }
  @Delete('saved-prompts/:id') deletePrompt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.savedPrompt.deleteMany({
      where: { id, userId: user.id },
    });
  }
}

@Controller('admin/workspace')
@UseGuards(AccessTokenGuard)
@Roles('ADMIN')
export class WorkspaceAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ModelRegistryService,
  ) {}
  @Get('configuration') async configuration() {
    return {
      models: await this.prisma.aIModel.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
      plans: await this.prisma.billingPlan.findMany(),
      policies: await this.prisma.generationPolicy.findMany(),
    };
  }
  @Post('models') addModel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: unknown,
  ) {
    return this.registry.saveModel(user.id, input);
  }
  @Patch('models/:id') editModel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.registry.saveModel(user.id, input, id);
  }
  @Post('policies') policy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: unknown,
  ) {
    return this.registry.savePolicy(user.id, input);
  }
  @Get('analytics') async analytics() {
    const since = new Date(Date.now() - 30 * 86400000);
    const where = { createdAt: { gte: since } };
    return {
      since,
      costs: await this.prisma.usageRecord.groupBy({
        by: [
          'provider',
          'modelName',
          'currency',
          'routingMode',
          'status',
          'costEstimated',
        ],
        where,
        _sum: { estimatedCost: true },
        _avg: { latencyMs: true },
        _count: true,
      }),
      users: await this.prisma.usageRecord.groupBy({
        by: ['userId', 'currency'],
        where,
        _sum: { estimatedCost: true },
        _count: true,
        orderBy: { _sum: { estimatedCost: 'desc' } },
        take: 100,
      }),
      revenue: await this.prisma.billingPayment.groupBy({
        by: ['currency', 'userId'],
        where: { status: 'PAID', paidAt: { gte: since } },
        _sum: { amount: true },
      }),
      activeSubscriptions: await this.prisma.billingSubscription.count({
        where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
      }),
      note: 'Provider costs are in major currency units; payments are in minor units. Do not subtract different currencies. Estimated costs require provider reconciliation. Revenue is cash received, not recognized MRR.',
    };
  }
}
