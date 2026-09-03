import { IsIn } from 'class-validator';

export class ReviewGenerationDto {
  @IsIn(['REJECT', 'PUBLISH'])
  action!: 'REJECT' | 'PUBLISH';
}
