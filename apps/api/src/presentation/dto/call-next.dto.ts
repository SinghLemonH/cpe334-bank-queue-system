import { IsOptional, IsUUID } from 'class-validator';

/** POST /api/queues/:code/call-next body (F-07 contract 4.1). Unknown fields are rejected globally. */
export class CallNextDto {
  @IsOptional()
  @IsUUID('4')
  counterId?: string;
}
