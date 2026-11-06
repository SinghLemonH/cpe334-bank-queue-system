import { IsString, Length } from 'class-validator';

/** POST /api/auth/login body (F-01 contract R10). Unknown fields are rejected globally. */
export class LoginDto {
  @IsString()
  @Length(1, 64)
  username!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}
