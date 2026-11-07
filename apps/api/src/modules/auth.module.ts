import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../application/auth.service';
import { SessionEntity } from '../infrastructure/entities/session.entity';
import { UserEntity } from '../infrastructure/entities/user.entity';
import { AuthController } from '../presentation/controllers/auth.controller';
import { JsonBodyGuard } from '../presentation/guards/json-body.guard';
import { RolesGuard } from '../presentation/guards/roles.guard';
import { SessionAuthGuard } from '../presentation/guards/session-auth.guard';

/**
 * F-01. QueueModule (F-02) and ServiceDeskModule (F-03) import this module and use
 * @UseGuards(SessionAuthGuard, RolesGuard) + @Roles(...) + @CurrentUser().
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, SessionEntity])],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, RolesGuard, JsonBodyGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard, JsonBodyGuard, TypeOrmModule],
})
export class AuthModule {}
