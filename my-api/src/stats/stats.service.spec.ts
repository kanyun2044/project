import { Prisma,StatsUnit } from '@prisma/client';
import { StatsService } from './stats.service';

describe('StatsService', () => {
    let service:StatsService;
    let prisma:any;
    let tx:any;

    beforeEach(() => {
        tx = {
            chatSession:{
                count:jest.fn()
            },
            chatMessage:{
                count:jest.fn()
            },
            order:{
                aggregate:jest.fn()
            },
            userStats:{
                upsert:jest.fn()
            }
        };
        prisma = {
            userStats:{
                findMany:jest.fn()
            },
            order:{
                groupBy:jest.fn()
            },
            user:{
                findMany:jest.fn()
            },
            $transaction:jest.fn((callback) => callback(tx))
        };
        service = new StatsService(prisma);
    });

    it('returns a warning for an invalid dimension', async () => {
        const result = await service.getSummary('manager-1',{
            startDate:'2026-09-01',
            endDate:'2026-09-02',
            dimension:'year'
        });

        expect(result.warning).toBe('dimension must be day, week or month');
        expect(result.isEmpty).toBe(true);
        expect(result.series).toEqual([]);
        expect(prisma.userStats.findMany).not.toHaveBeenCalled();
    });

    it('returns a warning for an invalid date range', async () => {
        const result = await service.getSummary('manager-1',{
            startDate:'2026-09-03',
            endDate:'2026-09-01',
            dimension:'day'
        });

        expect(result.warning).toBe('startDate cannot be later than endDate');
        expect(result.summary.totalOrders).toBe(0);
    });

    it('returns zero values for an empty date range', async () => {
        prisma.userStats.findMany.mockResolvedValue([]);

        const result = await service.getSummary('manager-1',{
            startDate:'2026-09-01',
            endDate:'2026-09-02',
            dimension:'day'
        });

        expect(result.warning).toBeNull();
        expect(result.isEmpty).toBe(true);
        expect(result.summary).toEqual({
            totalChatSessions:0,
            totalMessages:0,
            totalOrders:0,
            totalAmount:0,
            conversionRate:0
        });
        expect(result.series).toHaveLength(2);
    });

    it('uses day as the default dimension', async () => {
        prisma.userStats.findMany.mockResolvedValue([]);

        const result = await service.getSummary('manager-1',{
            startDate:'2026-09-01',
            endDate:'2026-09-01'
        });

        expect(result.warning).toBeNull();
        expect(result.dimension).toBe('day');
    });

    it('groups daily rows into weekly data', async () => {
        prisma.userStats.findMany.mockResolvedValue([
            {
                statDate:new Date('2026-09-01T00:00:00.000Z'),
                chatSessionCount:2,
                messageCount:8,
                orderCount:1,
                orderAmount:new Prisma.Decimal('20.50'),
                conversionRate:new Prisma.Decimal('50')
            },
            {
                statDate:new Date('2026-09-02T00:00:00.000Z'),
                chatSessionCount:2,
                messageCount:4,
                orderCount:1,
                orderAmount:new Prisma.Decimal('10.50'),
                conversionRate:new Prisma.Decimal('50')
            }
        ]);

        const result = await service.getSummary('manager-1',{
            startDate:'2026-09-01',
            endDate:'2026-09-02',
            dimension:'week'
        });

        expect(result.summary.totalChatSessions).toBe(4);
        expect(result.summary.totalMessages).toBe(12);
        expect(result.summary.totalOrders).toBe(2);
        expect(result.summary.totalAmount).toBe(31);
        expect(result.summary.conversionRate).toBe(50);
        expect(result.series).toEqual([
            {
                period:'2026-08-31',
                chatSessionCount:4,
                messageCount:12,
                orderCount:2,
                orderAmount:31,
                conversionRate:50
            }
        ]);
    });

    it('returns complete order status and type distributions', async () => {
        prisma.order.groupBy
            .mockResolvedValueOnce([
                {status:'PAID',_count:{_all:3}},
                {status:'CANCELED',_count:{_all:1}}
            ])
            .mockResolvedValueOnce([
                {type:'FLIGHT',_count:{_all:3}},
                {type:'HOTEL',_count:{_all:1}}
            ]);

        const result = await service.getOrderDistribution('manager-1',{
            startDate:'2026-09-01',
            endDate:'2026-09-30'
        });

        expect(result.warning).toBeNull();
        expect(result.isEmpty).toBe(false);
        expect(result.statusDistribution.find((item) => item.name === 'PAID')).toEqual({
            name:'PAID',
            value:3,
            percentage:75
        });
        expect(result.typeDistribution.find((item) => item.name === 'HOTEL')).toEqual({
            name:'HOTEL',
            value:1,
            percentage:25
        });
    });

    it('aggregates one user and upserts one daily row in a transaction', async () => {
        tx.chatSession.count.mockResolvedValue(4);
        tx.chatMessage.count.mockResolvedValue(15);
        tx.order.aggregate.mockResolvedValue({
            _count:{_all:2},
            _sum:{totalAmount:new Prisma.Decimal('88.60')}
        });
        tx.userStats.upsert.mockResolvedValue({id:'stats-1'});

        const result = await service.aggregateUserDate(
            'manager-1',
            '2026-09-01'
        );

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(tx.userStats.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where:{
                    userId_statDate:{
                        userId:'manager-1',
                        statDate:new Date('2026-09-01T00:00:00.000Z')
                    }
                },
                update:expect.objectContaining({
                    unit:StatsUnit.DAY,
                    chatSessionCount:4,
                    messageCount:15,
                    orderCount:2
                })
            })
        );
        expect(result).toEqual({id:'stats-1'});
    });

    it('propagates an aggregation error so the transaction can roll back', async () => {
        tx.chatSession.count.mockResolvedValue(1);
        tx.chatMessage.count.mockResolvedValue(2);
        tx.order.aggregate.mockResolvedValue({
            _count:{_all:1},
            _sum:{totalAmount:new Prisma.Decimal('10')}
        });
        tx.userStats.upsert.mockRejectedValue(new Error('write failed'));

        await expect(
            service.aggregateUserDate('manager-1','2026-09-01')
        ).rejects.toThrow('write failed');
    });

    it('retries a failed user aggregation', async () => {
        prisma.user.findMany.mockResolvedValue([{id:'manager-1'}]);
        jest.spyOn(service,'aggregateUserDate')
            .mockRejectedValueOnce(new Error('temporary failure'))
            .mockResolvedValueOnce({id:'stats-1'} as any);
        jest.spyOn(service as any,'delay').mockResolvedValue(undefined);

        const result = await service.aggregateDateForAllUsers('2026-09-01');

        expect(service.aggregateUserDate).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            statDate:'2026-09-01',
            unit:StatsUnit.DAY,
            successCount:1,
            failedCount:0
        });
    });
});
