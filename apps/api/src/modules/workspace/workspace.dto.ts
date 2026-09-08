import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
export class ConversationDto {
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) title?: string;
  @IsOptional() @IsBoolean() archived?: boolean;
}
export class SavedPromptDto {
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MinLength(1) @MaxLength(100000) content!: string;
}
export class SendMessageDto {
  @IsOptional() @IsIn(['txt', 'md', 'csv']) fileFormat?: 'txt' | 'md' | 'csv';
  @IsOptional() @IsInt() @Min(1) @Max(100000) maxCredits?: number;
  @IsOptional() @IsIn(['chat', 'image_generation', 'file_generation']) feature?:
    'chat' | 'image_generation' | 'file_generation';
  @IsUUID() requestId!: string;
  @IsString() @MinLength(1) @MaxLength(2000000) content!: string;
  @IsIn(['AUTO', 'MANUAL']) mode!: 'AUTO' | 'MANUAL';
  @IsOptional() @IsUUID() modelId?: string;
  @IsOptional() @IsUUID() regenerateMessageId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
export class TaskIntentDto {
  @IsString() @MaxLength(2000000) content!: string;
}
