import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';
import { OrderModule } from './order/order.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StatsModule } from './stats/stats.module';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    ChatModule,
    OrderModule,
    StatsModule
  ],

  controllers: [AppController],

  providers: [AppService,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }

  ],
})
export class AppModule {}
