import { Controller, Get } from '@nestjs/common';
import { ModelRegistryService } from './registry.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly registry: ModelRegistryService) {}
  @Get('models') async models() {
    return (await this.registry.available()).map((model) => ({
      id: model.id,
      provider: model.provider,
      displayName: model.displayName,
      description: model.description,
      capabilities: model.capabilities,
      capabilityStates: model.capabilityStates,
      reasoningLevels: model.reasoningLevels,
      defaultReasoningLevel: model.defaultReasoningLevel,
      available: model.available,
      autoAvailable: model.autoAvailable,
    }));
  }
}
