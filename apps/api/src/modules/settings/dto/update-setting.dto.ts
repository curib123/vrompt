import { IsDefined } from 'class-validator';

export class UpdateSettingDto {
  @IsDefined()
  value!: unknown;
}
