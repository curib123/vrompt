import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ProjectsService } from './projects.service';

@Controller('workspace/projects')
@UseGuards(AccessTokenGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}
  @Get() list(@CurrentUser() u: AuthenticatedUser, @Query('q') q = '') {
    return this.projects.list(u.id, q);
  }
  @Post() create(@CurrentUser() u: AuthenticatedUser, @Body() input: unknown) {
    return this.projects.save(u.id, input);
  }
  @Get(':id') detail(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projects.detail(u.id, id);
  }
  @Patch(':id') edit(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.projects.save(u.id, input, id);
  }
  @Delete(':id') remove(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projects.remove(u.id, id);
  }
}
