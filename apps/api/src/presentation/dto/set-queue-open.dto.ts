import { IsBoolean } from 'class-validator';

/** PATCH /api/queues/:code body (F-08 contract 4.6). Unknown fields are rejected globally. */
export class SetQueueOpenDto {
  @IsBoolean()
  isOpen!: boolean;
}
