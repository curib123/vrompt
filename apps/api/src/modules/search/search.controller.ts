import { Controller, Get, Query } from '@nestjs/common';

import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('/explore')
  explore() {
    return this.searchService.explore();
  }

  @Get()
  search(@Query() input: SearchQueryDto) {
    return this.searchService.search(input);
  }
}
