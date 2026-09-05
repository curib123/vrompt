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
} from 'class-validator';
export class ConversationDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) title?: string;
  @IsOptional() @IsBoolean() archived?: boolean;
}
export class SavedPromptDto {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MinLength(1) @MaxLength(100000) content!: string;
}
export class SendMessageDto {
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
