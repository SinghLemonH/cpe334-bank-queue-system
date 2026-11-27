import { Module } from '@nestjs/common';
import { BoardService } from '../application/board.service';
import { BoardController } from '../presentation/controllers/board.controller';

@Module({
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
