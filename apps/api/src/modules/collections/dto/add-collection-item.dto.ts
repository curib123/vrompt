import { IsUUID } from 'class-validator';

export class AddCollectionItemDto {
  @IsUUID()
  promptRepositoryId!: string;
}
