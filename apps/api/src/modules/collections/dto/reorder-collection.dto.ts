import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class ReorderCollectionDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  promptRepositoryIds!: string[];
}
