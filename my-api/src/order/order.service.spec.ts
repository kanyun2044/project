/// <reference types="jest" />
import { BadRequestException,NotFoundException } from '@nestjs/common';
import { OrderStatus,OrderType } from '@prisma/client';
import { OrderService } from './order.service';

describe('OrderService', () => {
    let service:OrderService;
    let prisma:any;

    beforeEach(() => {
        prisma = {
            order:{
                findMany:jest.fn(),
                count:jest.fn(),
                findFirst:jest.fn(),
                update:jest.fn(),
                create:jest.fn()
            },
            chatSession:{
                findFirst:jest.fn(),
                update:jest.fn()
            },
            chatMessage:{
                create:jest.fn()
            }
        };
        prisma.$transaction = jest.fn((work:any) => {
            return typeof work === 'function'
                ? work(prisma)
                : Promise.all(work);
        });
        service = new OrderService(prisma);
    });

    it('limits page size and filters orders by user', async () => {
        prisma.order.findMany.mockResolvedValue([]);
        prisma.order.count.mockResolvedValue(0);

        const result = await service.getOrders(
            'user-1',
            {
                page:'0',
                pageSize:'100'
            }
        );

        expect(result).toEqual({
            items:[],
            total:0,
            page:1,
            pageSize:50
        });
        expect(prisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where:expect.objectContaining({
                    userId:'user-1',
                    isDelete:false
                }),
                skip:0,
                take:50
            })
        );
    });

    it('rejects an invalid order status change', async () => {
        prisma.order.findFirst.mockResolvedValue({
            id:'order-1',
            status:OrderStatus.CANCELED,
            chatSessionId:null
        });

        await expect(
            service.updateStatus(
                'user-1',
                'order-1',
                {status:OrderStatus.PAID}
            )
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an order owned by another user', async () => {
        prisma.order.findFirst.mockResolvedValue(null);

        await expect(
            service.getOrder('user-1','order-1')
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates an existing pending order instead of creating another one', async () => {
        const existingOrder = {
            id:'order-1',
            status:OrderStatus.PENDING_CONFIRM
        };
        prisma.order.findFirst.mockResolvedValue(existingOrder);
        prisma.order.update.mockResolvedValue({
            ...existingOrder,
            totalAmount:300
        });

        const result = await service.preparePendingOrderFromChat(
            prisma,
            'user-1',
            'chat-1',
            OrderType.FLIGHT,
            300,
            {from:'Boston',to:'Tokyo'}
        );

        expect(result.totalAmount).toBe(300);
        expect(prisma.order.update).toHaveBeenCalledWith({
            where:{
                id:'order-1'
            },
            data:{
                type:OrderType.FLIGHT,
                totalAmount:300,
                bookingDetails:{from:'Boston',to:'Tokyo'}
            }
        });
        expect(prisma.order.create).not.toHaveBeenCalled();
    });
});
