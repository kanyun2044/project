import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@Module({
  imports:[PrismaModule,AuthModule],

  providers:[UserService],

  controllers:[UserController]
})
export class UserModule {}