/// <reference types="jest" />
import { OrderStatus,OrderType } from '@prisma/client';
import { OrderController } from './order.controller';

describe('OrderController', () => {
    let controller:OrderController;
    let orderService:any;

    beforeEach(() => {
        orderService = {
            createOrder:jest.fn(),
            getOrders:jest.fn(),
            updateStatus:jest.fn()
        };
        controller = new OrderController(orderService);
    });

    it('creates an order for the current user', () => {
        const data = {
            type:OrderType.FLIGHT,
            totalAmount:200,
            bookingDetails:{
                from:'Boston',
                to:'Tokyo'
            }
        };

        controller.createOrder(
            {user:{sub:'user-1'}},
            data
        );

        expect(orderService.createOrder).toHaveBeenCalledWith(
            'user-1',
            data
        );
    });

    it('passes order filters to the service', () => {
        const query = {
            status:OrderStatus.PAID,
            type:OrderType.FLIGHT,
            page:'1',
            pageSize:'10'
        };

        controller.getOrders(
            {user:{sub:'user-1'}},
            query
        );

        expect(orderService.getOrders).toHaveBeenCalledWith(
            'user-1',
            query
        );
    });

    it('updates only the current user order', () => {
        const data = {
            status:OrderStatus.PAID
        };

        controller.updateStatus(
            {user:{sub:'user-1'}},
            'order-1',
            data
        );

        expect(orderService.updateStatus).toHaveBeenCalledWith(
            'user-1',
            'order-1',
            data
        );
    });
});
