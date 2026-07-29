import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';


@Module({
  imports: [PrismaModule,AuthModule,UserModule,ChatModule],

  controllers: [AppController],

  providers: [AppService,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }

  ],
})
export class AppModule {}
