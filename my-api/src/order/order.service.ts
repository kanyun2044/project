import { BadRequestException,Injectable,NotFoundException } from '@nestjs/common';
import { ChatRole,OrderStatus,OrderType,Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
    constructor(private prisma:PrismaService){}

    async createOrder(userId:string,data:CreateOrderDto){
        return this.prisma.$transaction(async (tx) => {
            if(data.chatSessionId){
                const session = await tx.chatSession.findFirst({
                    where:{
                        id:data.chatSessionId,
                        userId
                    }
                });

                if(!session){
                    throw new BadRequestException('Chat session not found');
                }
            }

            return tx.order.create({
                data:{
                    userId,
                    chatSessionId:data.chatSessionId,
                    orderNo:this.createOrderNo(),
                    type:data.type,
                    status:OrderStatus.PENDING_CONFIRM,
                    totalAmount:data.totalAmount,
                    bookingDetails:data.bookingDetails as Prisma.InputJsonValue,
                    paymentMethod:data.paymentMethod
                }
            });
        });
    }

    async getOrders(userId:string,query:QueryOrderDto){
        const page = Math.max(Number(query.page || 1),1);
        const pageSize = Math.min(Math.max(Number(query.pageSize || 10),1),50);

        const where:Prisma.OrderWhereInput = {
            userId,
            isDelete:false,
            status:query.status,
            type:query.type
        };

        const [items,total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where,
                orderBy:{
                    createdAt:'desc'
                },
                skip:(page - 1) * pageSize,
                take:pageSize
            }),
            this.prisma.order.count({
                where
            })
        ]);

        return {
            items,
            total,
            page,
            pageSize
        };
    }

    async getOrder(userId:string,orderId:string){
        return this.findOwnedOrder(
            userId,
            orderId
        );
    }

    async getOrdersBySession(userId:string,sessionId:string){
        const session = await this.prisma.chatSession.findFirst({
            where:{
                id:sessionId,
                userId
            }
        });

        if(!session){
            throw new NotFoundException('Chat session not found');
        }

        return this.prisma.order.findMany({
            where:{
                userId,
                chatSessionId:sessionId,
                isDelete:false
            },
            orderBy:{
                createdAt:'desc'
            }
        });
    }

    async getSessionByOrder(userId:string,orderId:string){
        const order = await this.prisma.order.findFirst({
            where:{
                id:orderId,
                userId,
                isDelete:false
            },
            include:{
                chatSession:{
                    include:{
                        messages:{
                            orderBy:{
                                createdAt:'asc'
                            },
                            include:{
                                attachments:true
                            }
                        }
                    }
                }
            }
        });

        if(!order){
            throw new NotFoundException('Order not found');
        }

        if(!order.chatSession){
            throw new NotFoundException('Order chat session not found');
        }

        return order.chatSession;
    }

    async updateStatus(
        userId:string,
        orderId:string,
        data:UpdateOrderStatusDto
    ){
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where:{
                    id:orderId,
                    userId,
                    isDelete:false
                }
            });

            if(!order){
                throw new NotFoundException('Order not found');
            }

            this.validateStatusChange(
                order.status,
                data.status
            );

            const updatedOrder = await tx.order.update({
                where:{
                    id:orderId
                },
                data:{
                    status:data.status,
                    paymentMethod:data.paymentMethod ?? order.paymentMethod,
                    paymentNo:data.paymentNo ?? order.paymentNo,
                    confirmedAt:data.status === OrderStatus.PENDING_PAYMENT
                    ? new Date()
                    : order.confirmedAt,
                    paidAt:data.status === OrderStatus.PAID
                    ? new Date()
                    : order.paidAt,
                    canceledAt:data.status === OrderStatus.CANCELED
                    ? new Date()
                    : order.canceledAt,
                    completedAt:data.status === OrderStatus.COMPLETED
                    ? new Date()
                    : order.completedAt
                }
            });

            if(order.chatSessionId){
                await this.createStatusChatMessage(
                    tx,
                    userId,
                    order.chatSessionId,
                    updatedOrder
                );
            }

            return updatedOrder;
        });
    }

    async deleteOrder(userId:string,orderId:string){
        await this.findOwnedOrder(
            userId,
            orderId
        );

        return this.prisma.order.update({
            where:{
                id:orderId
            },
            data:{
                isDelete:true,
                deleteAt:new Date()
            }
        });
    }

    async preparePendingOrderFromChat(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string,
        type:OrderType,
        totalAmount:number,
        bookingDetails:Record<string,unknown>
    ){
        const existingOrder = await tx.order.findFirst({
            where:{
                userId,
                chatSessionId:sessionId,
                type,
                status:OrderStatus.PENDING_CONFIRM,
                isDelete:false
            },
            orderBy:{
                createdAt:'desc'
            }
        });

        return existingOrder
        ? tx.order.update({
            where:{
                id:existingOrder.id
            },
            data:{
                type,
                totalAmount,
                bookingDetails:bookingDetails as Prisma.InputJsonValue
            }
        })
        : tx.order.create({
            data:{
                userId,
                chatSessionId:sessionId,
                orderNo:this.createOrderNo(),
                type,
                status:OrderStatus.PENDING_CONFIRM,
                totalAmount,
                bookingDetails:bookingDetails as Prisma.InputJsonValue
            }
        });
    }

    async confirmFromChat(userId:string,orderId:string){
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where:{
                    id:orderId,
                    userId,
                    isDelete:false
                }
            });

            if(!order){
                throw new NotFoundException('Order not found');
            }

            if(!order.chatSessionId){
                throw new BadRequestException('Order is not linked to a chat session');
            }

            this.validateStatusChange(
                order.status,
                OrderStatus.PENDING_PAYMENT
            );

            const updatedOrder = await tx.order.update({
                where:{
                    id:orderId
                },
                data:{
                    status:OrderStatus.PENDING_PAYMENT,
                    confirmedAt:new Date()
                }
            });

            const systemMessage = await tx.chatMessage.create({
                data:{
                    userId,
                    sessionId:order.chatSessionId,
                    role:ChatRole.SYSTEM,
                    content:`Order ${order.orderNo} confirmed. Please continue to payment.`,
                    metadata:{
                        type:'ORDER_CONFIRMED',
                        orderId:updatedOrder.id,
                        orderNo:updatedOrder.orderNo,
                        orderSnapshot:this.createOrderSnapshot(updatedOrder)
                    } as Prisma.InputJsonValue
                }
            });

            await tx.chatSession.update({
                where:{
                    id:order.chatSessionId
                },
                data:{
                    updatedAt:new Date()
                }
            });

            return {
                order:updatedOrder,
                message:systemMessage
            };
        });
    }

    async cancelFromChat(userId:string,orderId:string){
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where:{
                    id:orderId,
                    userId,
                    isDelete:false
                }
            });

            if(!order){
                throw new NotFoundException('Order not found');
            }

            if(!order.chatSessionId){
                throw new BadRequestException('Order is not linked to a chat session');
            }

            this.validateStatusChange(
                order.status,
                OrderStatus.CANCELED
            );

            const updatedOrder = await tx.order.update({
                where:{
                    id:orderId
                },
                data:{
                    status:OrderStatus.CANCELED,
                    canceledAt:new Date()
                }
            });

            const systemMessage = await this.createCanceledChatMessage(
                tx,
                userId,
                order.chatSessionId,
                updatedOrder
            );

            await tx.chatSession.update({
                where:{
                    id:order.chatSessionId
                },
                data:{
                    bookingDraft:Prisma.JsonNull,
                    updatedAt:new Date()
                }
            });

            return {
                order:updatedOrder,
                message:systemMessage
            };
        });
    }

    async payFromChat(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        return this.updateStatusFromChat(
            userId,
            sessionId,
            orderId,
            OrderStatus.PAID,
            {
                paymentMethod:'chat',
                paymentNo:`PAY${Date.now()}`
            }
        );
    }

    async completeFromChat(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        return this.updateStatusFromChat(
            userId,
            sessionId,
            orderId,
            OrderStatus.COMPLETED
        );
    }

    private async findOwnedOrder(userId:string,orderId:string){
        const order = await this.prisma.order.findFirst({
            where:{
                id:orderId,
                userId,
                isDelete:false
            }
        });

        if(!order){
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    private validateStatusChange(
        currentStatus:OrderStatus,
        nextStatus:OrderStatus
    ){
        const allowed:Record<OrderStatus,OrderStatus[]> = {
            PENDING_CONFIRM:[
                OrderStatus.PENDING_PAYMENT,
                OrderStatus.CANCELED
            ],
            PENDING_PAYMENT:[
                OrderStatus.PAID,
                OrderStatus.CANCELED
            ],
            PAID:[
                OrderStatus.COMPLETED,
                OrderStatus.CANCELED
            ],
            CANCELED:[],
            COMPLETED:[]
        };

        if(!allowed[currentStatus].includes(nextStatus)){
            throw new BadRequestException('Invalid order status change');
        }
    }

    private createOrderNo(){
        const random = Math.random().toString(36).slice(2,8).toUpperCase();
        return `ORD${Date.now()}${random}`;
    }

    private async updateStatusFromChat(
        userId:string,
        sessionId:string,
        orderId:string,
        nextStatus:OrderStatus,
        payment?:{
            paymentMethod?:string;
            paymentNo?:string;
        }
    ){
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where:{
                    id:orderId,
                    userId,
                    chatSessionId:sessionId,
                    isDelete:false
                }
            });

            if(!order){
                throw new NotFoundException('Order not found');
            }

            this.validateStatusChange(
                order.status,
                nextStatus
            );

            const updatedOrder = await tx.order.update({
                where:{
                    id:orderId
                },
                data:{
                    status:nextStatus,
                    paymentMethod:payment?.paymentMethod ?? order.paymentMethod,
                    paymentNo:payment?.paymentNo ?? order.paymentNo,
                    paidAt:nextStatus === OrderStatus.PAID
                    ? new Date()
                    : order.paidAt,
                    completedAt:nextStatus === OrderStatus.COMPLETED
                    ? new Date()
                    : order.completedAt
                }
            });

            const systemMessage = await this.createStatusChatMessage(
                tx,
                userId,
                sessionId,
                updatedOrder
            );

            return {
                order:updatedOrder,
                message:systemMessage
            };
        });
    }

    private async createStatusChatMessage(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string,
        order:any
    ){
        const statusMessageMap:Partial<Record<OrderStatus,{
            type:string;
            content:string;
            clearDraft?:boolean;
        }>> = {
            PENDING_PAYMENT:{
                type:'ORDER_CONFIRMED',
                content:`Order ${order.orderNo} confirmed. Please continue to payment.`
            },
            PAID:{
                type:'ORDER_PAID',
                content:`Order ${order.orderNo} paid.`
            },
            CANCELED:{
                type:'ORDER_CANCELED',
                content:`Order ${order.orderNo} canceled.`,
                clearDraft:true
            },
            COMPLETED:{
                type:'ORDER_COMPLETED',
                content:`Order ${order.orderNo} completed.`
            }
        };

        const message = statusMessageMap[order.status];

        if(!message){
            return null;
        }

        const systemMessage = await tx.chatMessage.create({
            data:{
                userId,
                sessionId,
                role:ChatRole.SYSTEM,
                content:message.content,
                metadata:{
                    type:message.type,
                    orderId:order.id,
                    orderNo:order.orderNo,
                    orderSnapshot:this.createOrderSnapshot(order)
                } as Prisma.InputJsonValue
            }
        });

        await tx.chatSession.update({
            where:{
                id:sessionId
            },
            data:{
                bookingDraft:message.clearDraft
                ? Prisma.JsonNull
                : undefined,
                updatedAt:new Date()
            }
        });

        return systemMessage;
    }

    private createCanceledChatMessage(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string,
        order:any
    ){
        return tx.chatMessage.create({
            data:{
                userId,
                sessionId,
                role:ChatRole.SYSTEM,
                content:`Order ${order.orderNo} canceled.`,
                metadata:{
                    type:'ORDER_CANCELED',
                    orderId:order.id,
                    orderNo:order.orderNo,
                    orderSnapshot:this.createOrderSnapshot(order)
                } as Prisma.InputJsonValue
            }
        });
    }

    createOrderSnapshot(order:any){
        return {
            id:order.id,
            orderNo:order.orderNo,
            type:order.type,
            status:order.status,
            chatSessionId:order.chatSessionId,
            totalAmount:Number(order.totalAmount),
            bookingDetails:order.bookingDetails,
            paymentMethod:order.paymentMethod,
            paymentNo:order.paymentNo,
            confirmedAt:order.confirmedAt?.toISOString?.() ?? order.confirmedAt,
            paidAt:order.paidAt?.toISOString?.() ?? order.paidAt,
            canceledAt:order.canceledAt?.toISOString?.() ?? order.canceledAt,
            completedAt:order.completedAt?.toISOString?.() ?? order.completedAt,
            createdAt:order.createdAt?.toISOString?.() ?? order.createdAt,
            updatedAt:order.updatedAt?.toISOString?.() ?? order.updatedAt
        };
    }
}
