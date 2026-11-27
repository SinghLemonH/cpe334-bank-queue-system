import { Controller, Get, Header } from '@nestjs/common';
import { BoardService, BoardView } from '../../application/board.service';

/** F-06 Public Board: GET /api/public/board (contract 4.5, anonymous, Cache-Control: no-store). */
@Controller('public')
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get('board')
  @Header('Cache-Control', 'no-store')
  getBoard(): Promise<BoardView> {
    return this.board.getBoard();
  }
}
