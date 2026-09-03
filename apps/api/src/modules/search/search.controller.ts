import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('/explore')
  @UseGuards(OptionalAccessTokenGuard)
  explore(@CurrentUser() user?: AuthenticatedUser) {
    return this.searchService.explore(user?.id);
  }

  @Get('/sitemap')
  sitemap() {
    return this.searchService.sitemap();
  }

  @Get('/landing-pages')
  landingPages() {
    return this.searchService.landingPages();
  }

  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  search(
    @Query() input: SearchQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.searchService.search(input, user?.id);
  }
}
