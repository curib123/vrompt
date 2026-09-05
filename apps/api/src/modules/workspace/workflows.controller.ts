import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { WorkflowsService } from './workflows.service';
@Controller('workspace/workflows')
@UseGuards(AccessTokenGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}
  @Get() list(@CurrentUser() u: AuthenticatedUser) {
    return this.workflows.list(u.id);
  }
  @Post() create(@CurrentUser() u: AuthenticatedUser, @Body() input: unknown) {
    return this.workflows.save(u.id, input);
  }
  @Patch(':id') edit(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.workflows.save(u.id, input, id);
  }
  @Delete(':id') remove(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.remove(u.id, id);
  }
  @Get(':id/runs') history(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.history(u.id, id);
  }
  @Post(':id/runs') async run(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const controller = new AbortController();
    const close = () => controller.abort();
    res.on('close', close);
    try {
      return await this.workflows.run(u.id, id, input, controller.signal);
    } finally {
      res.off('close', close);
    }
  }
}
