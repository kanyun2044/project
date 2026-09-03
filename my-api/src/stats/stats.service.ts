import { Injectable,Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderStatus,OrderType,Prisma,StatsUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryOrderDistributionDto } from './dto/query-order-distribution.dto';
import { QueryStatsDto,StatsDimension } from './dto/query-stats.dto';

type StatsPoint = {
    period:string;
    chatSessionCount:number;
    messageCount:number;
    orderCount:number;
    orderAmount:number;
    conversionRate:number;
};

type DateRange = {
    startDate:string;
    endDate:string;
    startAt:Date;
    endAt:Date;
};

const STATS_TIME_ZONE = 'Asia/Shanghai';
const MAX_RANGE_DAYS = 3660;

@Injectable()
export class StatsService {
    private logger = new Logger(StatsService.name);

    constructor(private prisma:PrismaService){}

    async getSummary(userId:string,query:QueryStatsDto){
        const dimension = (query.dimension ?? StatsDimension.DAY) as StatsDimension;
        const warning = this.validateStatsQuery(query);

        if(warning){
            return this.createEmptySummary(
                query.dimension ?? StatsDimension.DAY,
                warning
            );
        }

        const startDate = query.startDate!;
        const endDate = query.endDate!;
        const rows = await this.prisma.userStats.findMany({
            where:{
                userId,
                unit:StatsUnit.DAY,
                statDate:{
                    gte:this.toStatsDate(startDate),
                    lte:this.toStatsDate(endDate)
                }
            },
            orderBy:{
                statDate:'asc'
            }
        });

        const rowMap = new Map(
            rows.map((row) => [
                this.formatDate(row.statDate),
                {
                    period:this.formatDate(row.statDate),
                    chatSessionCount:row.chatSessionCount,
                    messageCount:row.messageCount,
                    orderCount:row.orderCount,
                    orderAmount:Number(row.orderAmount),
                    conversionRate:Number(row.conversionRate)
                }
            ])
        );

        const dailyPoints = this.getDateKeys(startDate,endDate).map((date) => {
            return rowMap.get(date) ?? this.createEmptyPoint(date);
        });
        const series = this.groupPoints(dailyPoints,dimension);
        const totals = this.sumPoints(dailyPoints);

        return {
            warning:null,
            dimension,
            startDate,
            endDate,
            isEmpty:
                totals.chatSessionCount === 0 &&
                totals.messageCount === 0 &&
                totals.orderCount === 0,
            summary:{
                totalChatSessions:totals.chatSessionCount,
                totalMessages:totals.messageCount,
                totalOrders:totals.orderCount,
                totalAmount:totals.orderAmount,
                conversionRate:this.calculateConversionRate(
                    totals.orderCount,
                    totals.chatSessionCount
                )
            },
            series
        };
    }

    async getOrderDistribution(
        userId:string,
        query:QueryOrderDistributionDto
    ){
        const rangeResult = this.validateDateRange(
            query.startDate,
            query.endDate
        );

        if(typeof rangeResult === 'string'){
            return this.createEmptyDistribution(rangeResult);
        }

        const where:Prisma.OrderWhereInput = {
            userId,
            isDelete:false,
            createdAt:{
                gte:rangeResult.startAt,
                lt:rangeResult.endAt
            }
        };

        const [statusRows,typeRows] = await Promise.all([
            this.prisma.order.groupBy({
                by:['status'],
                where,
                _count:{
                    _all:true
                }
            }),
            this.prisma.order.groupBy({
                by:['type'],
                where,
                _count:{
                    _all:true
                }
            })
        ]);

        const statusMap = new Map(
            statusRows.map((row) => [row.status,row._count._all])
        );
        const typeMap = new Map(
            typeRows.map((row) => [row.type,row._count._all])
        );
        const total = statusRows.reduce(
            (sum,row) => sum + row._count._all,
            0
        );

        return {
            warning:null,
            startDate:rangeResult.startDate,
            endDate:rangeResult.endDate,
            isEmpty:total === 0,
            statusDistribution:Object.values(OrderStatus).map((status) => {
                const value = statusMap.get(status) ?? 0;

                return {
                    name:status,
                    value,
                    percentage:this.calculatePercentage(value,total)
                };
            }),
            typeDistribution:Object.values(OrderType).map((type) => {
                const value = typeMap.get(type) ?? 0;

                return {
                    name:type,
                    value,
                    percentage:this.calculatePercentage(value,total)
                };
            })
        };
    }

    @Cron('0 5 1 * * *',{
        timeZone:STATS_TIME_ZONE
    })
    async aggregatePreviousDay(){
        const today = this.getBusinessDate(new Date());
        const statDate = this.addDays(today,-1);

        try {
            const result = await this.aggregateDateForAllUsers(statDate);

            this.logger.log(
                `Stats aggregation completed for ${statDate}: ${result.successCount} succeeded, ${result.failedCount} failed`
            );

            return result;
        } catch (error) {
            this.logger.error(
                `Stats aggregation task failed for ${statDate}`,
                error instanceof Error ? error.stack : String(error)
            );

            throw error;
        }
    }

    async aggregateDateForAllUsers(statDate:string){
        if(!this.parseDate(statDate)){
            throw new Error('Invalid aggregation date');
        }

        const users = await this.prisma.user.findMany({
            where:{
                isDelete:false
            },
            select:{
                id:true
            }
        });
        let successCount = 0;
        let failedCount = 0;

        for(const user of users){
            try {
                await this.aggregateUserDateWithRetry(
                    user.id,
                    statDate
                );
                successCount += 1;
            } catch (error) {
                failedCount += 1;
                this.logger.error(
                    `Stats aggregation failed for user ${user.id} on ${statDate}`,
                    error instanceof Error ? error.stack : String(error)
                );
            }
        }

        return {
            statDate,
            unit:StatsUnit.DAY,
            successCount,
            failedCount
        };
    }

    async aggregateUserDate(userId:string,statDate:string){
        const rangeResult = this.validateDateRange(statDate,statDate);

        if(typeof rangeResult === 'string'){
            throw new Error(rangeResult);
        }

        return this.prisma.$transaction(async (tx) => {
            const dateWhere = {
                gte:rangeResult.startAt,
                lt:rangeResult.endAt
            };
            const [chatSessionCount,messageCount,orderResult] = await Promise.all([
                tx.chatSession.count({
                    where:{
                        userId,
                        createdAt:dateWhere
                    }
                }),
                tx.chatMessage.count({
                    where:{
                        userId,
                        createdAt:dateWhere
                    }
                }),
                tx.order.aggregate({
                    where:{
                        userId,
                        isDelete:false,
                        createdAt:dateWhere
                    },
                    _count:{
                        _all:true
                    },
                    _sum:{
                        totalAmount:true
                    }
                })
            ]);
            const orderCount = orderResult._count._all;
            const orderAmount = Number(orderResult._sum.totalAmount ?? 0);
            const conversionRate = this.calculateConversionRate(
                orderCount,
                chatSessionCount
            );

            return tx.userStats.upsert({
                where:{
                    userId_statDate:{
                        userId,
                        statDate:this.toStatsDate(statDate)
                    }
                },
                update:{
                    unit:StatsUnit.DAY,
                    chatSessionCount,
                    messageCount,
                    orderCount,
                    orderAmount:new Prisma.Decimal(orderAmount.toFixed(2)),
                    conversionRate:new Prisma.Decimal(conversionRate.toFixed(4))
                },
                create:{
                    userId,
                    statDate:this.toStatsDate(statDate),
                    unit:StatsUnit.DAY,
                    chatSessionCount,
                    messageCount,
                    orderCount,
                    orderAmount:new Prisma.Decimal(orderAmount.toFixed(2)),
                    conversionRate:new Prisma.Decimal(conversionRate.toFixed(4))
                }
            });
        });
    }

    private async aggregateUserDateWithRetry(
        userId:string,
        statDate:string
    ){
        const maxAttempts = 3;
        let lastError:unknown;

        for(let attempt = 1;attempt <= maxAttempts;attempt += 1){
            try {
                return await this.aggregateUserDate(userId,statDate);
            } catch (error) {
                lastError = error;
                this.logger.warn(
                    `Stats aggregation attempt ${attempt}/${maxAttempts} failed for user ${userId} on ${statDate}`
                );

                if(attempt < maxAttempts){
                    await this.delay(attempt * 1000);
                }
            }
        }

        throw lastError;
    }

    private validateStatsQuery(query:QueryStatsDto){
        const rangeWarning = this.validateDateRange(
            query.startDate,
            query.endDate
        );

        if(typeof rangeWarning === 'string'){
            return rangeWarning;
        }

        if(
            query.dimension &&
            !Object.values(StatsDimension).includes(query.dimension as StatsDimension)
        ){
            return 'dimension must be day, week or month';
        }

        return null;
    }

    private validateDateRange(
        startDate?:string,
        endDate?:string
    ):DateRange | string{
        if(!startDate || !endDate){
            return 'startDate and endDate are required';
        }

        const parsedStartDate = this.parseDate(startDate);
        const parsedEndDate = this.parseDate(endDate);

        if(!parsedStartDate || !parsedEndDate){
            return 'startDate and endDate must use YYYY-MM-DD format';
        }

        if(parsedStartDate.getTime() > parsedEndDate.getTime()){
            return 'startDate cannot be later than endDate';
        }

        const rangeDays = Math.floor(
            (parsedEndDate.getTime() - parsedStartDate.getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1;

        if(rangeDays > MAX_RANGE_DAYS){
            return `date range cannot exceed ${MAX_RANGE_DAYS} days`;
        }

        return {
            startDate,
            endDate,
            startAt:this.toBusinessDayStart(startDate),
            endAt:this.toBusinessDayStart(this.addDays(endDate,1))
        };
    }

    private groupPoints(points:StatsPoint[],dimension:StatsDimension){
        if(dimension === StatsDimension.DAY){
            return points;
        }

        const groups = new Map<string,StatsPoint>();

        for(const point of points){
            const period = dimension === StatsDimension.WEEK
                ? this.getWeekStart(point.period)
                : point.period.slice(0,7);
            const current = groups.get(period) ?? this.createEmptyPoint(period);

            current.chatSessionCount += point.chatSessionCount;
            current.messageCount += point.messageCount;
            current.orderCount += point.orderCount;
            current.orderAmount += point.orderAmount;
            groups.set(period,current);
        }

        return Array.from(groups.values()).map((point) => ({
            ...point,
            orderAmount:this.roundAmount(point.orderAmount),
            conversionRate:this.calculateConversionRate(
                point.orderCount,
                point.chatSessionCount
            )
        }));
    }

    private sumPoints(points:StatsPoint[]){
        const totals = points.reduce((result,point) => {
            result.chatSessionCount += point.chatSessionCount;
            result.messageCount += point.messageCount;
            result.orderCount += point.orderCount;
            result.orderAmount += point.orderAmount;
            return result;
        },this.createEmptyPoint('total'));

        return {
            ...totals,
            orderAmount:this.roundAmount(totals.orderAmount)
        };
    }

    private createEmptySummary(dimension:string,warning:string){
        return {
            warning,
            dimension,
            startDate:null,
            endDate:null,
            isEmpty:true,
            summary:{
                totalChatSessions:0,
                totalMessages:0,
                totalOrders:0,
                totalAmount:0,
                conversionRate:0
            },
            series:[]
        };
    }

    private createEmptyDistribution(warning:string){
        return {
            warning,
            startDate:null,
            endDate:null,
            isEmpty:true,
            statusDistribution:Object.values(OrderStatus).map((status) => ({
                name:status,
                value:0,
                percentage:0
            })),
            typeDistribution:Object.values(OrderType).map((type) => ({
                name:type,
                value:0,
                percentage:0
            }))
        };
    }

    private createEmptyPoint(period:string):StatsPoint{
        return {
            period,
            chatSessionCount:0,
            messageCount:0,
            orderCount:0,
            orderAmount:0,
            conversionRate:0
        };
    }

    private getDateKeys(startDate:string,endDate:string){
        const dates:string[] = [];
        let current = startDate;

        while(current <= endDate){
            dates.push(current);
            current = this.addDays(current,1);
        }

        return dates;
    }

    private getWeekStart(date:string){
        const parsedDate = this.parseDate(date)!;
        const day = parsedDate.getUTCDay();
        const offset = day === 0 ? -6 : 1 - day;

        return this.addDays(date,offset);
    }

    private getBusinessDate(date:Date){
        const parts = new Intl.DateTimeFormat('en-CA',{
            timeZone:STATS_TIME_ZONE,
            year:'numeric',
            month:'2-digit',
            day:'2-digit'
        }).formatToParts(date);
        const values = Object.fromEntries(
            parts.map((part) => [part.type,part.value])
        );

        return `${values.year}-${values.month}-${values.day}`;
    }

    private parseDate(value:string){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
            return null;
        }

        const [year,month,day] = value.split('-').map(Number);
        const parsedDate = new Date(Date.UTC(year,month - 1,day));

        if(
            parsedDate.getUTCFullYear() !== year ||
            parsedDate.getUTCMonth() !== month - 1 ||
            parsedDate.getUTCDate() !== day
        ){
            return null;
        }

        return parsedDate;
    }

    private addDays(value:string,days:number){
        const date = this.parseDate(value)!;
        date.setUTCDate(date.getUTCDate() + days);
        return this.formatDate(date);
    }

    private formatDate(date:Date){
        return date.toISOString().slice(0,10);
    }

    private toStatsDate(value:string){
        return new Date(`${value}T00:00:00.000Z`);
    }

    private toBusinessDayStart(value:string){
        return new Date(`${value}T00:00:00.000+08:00`);
    }

    private calculateConversionRate(orderCount:number,sessionCount:number){
        if(sessionCount === 0){
            return 0;
        }

        return Number(
            (Math.min(orderCount / sessionCount,1) * 100).toFixed(4)
        );
    }

    private calculatePercentage(value:number,total:number){
        if(total === 0){
            return 0;
        }

        return Number(((value / total) * 100).toFixed(2));
    }

    private roundAmount(value:number){
        return Number(value.toFixed(2));
    }

    private delay(milliseconds:number){
        return new Promise((resolve) => setTimeout(resolve,milliseconds));
    }
}
