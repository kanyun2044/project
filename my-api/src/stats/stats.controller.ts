import { Controller,Get,Query,Req,UseGuards } from '@nestjs/common';
import { QueryOrderDistributionDto } from './dto/query-order-distribution.dto';
import { QueryStatsDto } from './dto/query-stats.dto';
import { ManagerGuard } from './manager.guard';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(ManagerGuard)
export class StatsController {
    constructor(private statsService:StatsService){}

    @Get('summary')
    getSummary(@Req() request,@Query() query:QueryStatsDto){
        return this.statsService.getSummary(
            request.user.sub,
            query
        );
    }

    @Get('order-distribution')
    getOrderDistribution(
        @Req() request,
        @Query() query:QueryOrderDistributionDto
    ){
        return this.statsService.getOrderDistribution(
            request.user.sub,
            query
        );
    }
}
