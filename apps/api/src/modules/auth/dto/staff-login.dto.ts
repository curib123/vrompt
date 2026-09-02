import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class StaffLoginDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
