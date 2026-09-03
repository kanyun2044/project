import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ManagerGuard } from './manager.guard';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
    imports:[PrismaModule],
    controllers:[StatsController],
    providers:[StatsService,ManagerGuard],
    exports:[StatsService]
})
export class StatsModule {}
