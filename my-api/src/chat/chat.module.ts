import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';

@Module({
    imports: [PrismaModule,OrderModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule {}
