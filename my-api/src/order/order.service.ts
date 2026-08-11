import { BadRequestException,Injectable,NotFoundException } from '@nestjs/common';
import { OrderStatus,Prisma } from '@prisma/client';
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

            return tx.order.update({
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
}
