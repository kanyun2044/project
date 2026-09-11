import { BadRequestException,Injectable,NotFoundException } from '@nestjs/common';
import { ChatRole,OrderStatus,OrderType,Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { OrderService } from '../order/order.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import { join } from 'path';

type BookingIntent = 'NONE' | 'FLIGHT' | 'HOTEL';

type BookingAnalysis = {
    intent:BookingIntent;
    slots:Record<string,unknown>;
    missingSlots:string[];
    isModification:boolean;
    isPriceQuestion:boolean;
};

type BookingDraft = {
    intent:BookingIntent;
    slots:Record<string,unknown>;
    missingSlots:string[];
    status:'COLLECTING' | 'READY';
    orderId?:string;
    orderNo?:string;
    updatedAt:string;
};

@Injectable()
export class ChatService {

    private openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    constructor(
        private prisma:PrismaService,
        private orderService:OrderService
    ){}


    async getSessions(userId:string){

        return this.prisma.chatSession.findMany({
            where:{
                userId
            },
            orderBy:{
                updatedAt:'desc'
            },
            include:{
                messages:{
                    orderBy:{
                        createdAt:'desc'
                    },
                    take:1
                },
                orders:{
                    where:{
                        isDelete:false
                    },
                    select:{
                        id:true
                    },
                    take:1
                }
            }
        });

    }


    async createSession(
        userId:string,
        data:CreateChatSessionDto
    ){

        return this.prisma.chatSession.create({
            data:{
                userId,
                title:data.title?.trim() || 'New chat'
            }
        });

    }


    async updateSession(
        userId:string,
        sessionId:string,
        data:UpdateChatSessionDto
    ){

        await this.findOwnedSession(
            userId,
            sessionId
        );

        return this.prisma.chatSession.update({
            where:{
                id:sessionId
            },
            data:{
                title:data.title.trim()
            }
        });

    }


    async deleteSession(
        userId:string,
        sessionId:string
    ){

        await this.findOwnedSession(
            userId,
            sessionId
        );

        await this.prisma.chatSession.delete({
            where:{
                id:sessionId
            }
        });

        return {
            message:'Chat deleted successfully'
        };

    }


    async getMessages(
        userId:string,
        sessionId:string
    ){

        await this.findOwnedSession(
            userId,
            sessionId
        );

        return this.prisma.chatMessage.findMany({
            where:{
                sessionId
            },
            orderBy:{
                createdAt:'asc'
            },
            include:{
                attachments:true
            }
        });

    }


    async sendMessage(
        userId:string,
        sessionId:string,
        data:SendChatMessageDto
    ){

        const session =
        await this.findOwnedSession(
            userId,
            sessionId
        );

        const text = data.content.trim();

        const contextMessages =
        await this.prisma.chatMessage.findMany({
            where:{
                sessionId
            },
            orderBy:{
                createdAt:'desc'
            },
            take:20
        });

        const messagesForAi = [
            ...contextMessages.reverse(),
            {
                role:ChatRole.USER,
                content:text
            }
        ];

        const bookingAnalyses = await this.analyzeBookingIntents(
            text,
            session.bookingDraft
        );

        const isBookingMessage = bookingAnalyses.length > 0;

        const aiAnswer = isBookingMessage
        ? ''
        : await this.createAiAnswer(
            messagesForAi,
            data.attachments
        );

        return this.prisma.$transaction(async (tx) => {
            const userMessage =
            await tx.chatMessage.create({
                data:{
                    userId,
                    sessionId,
                    role:ChatRole.USER,
                    content:text,
                    metadata:isBookingMessage
                    ? {
                        type:'BOOKING_USER_INPUT',
                        bookings:bookingAnalyses
                    } as Prisma.InputJsonValue
                    : undefined,
                    attachments:data.attachments?.length
                    ? {
                        create:data.attachments
                    }
                    : undefined
                },
                include:{
                    attachments:true
                }
            });

            let answer = aiAnswer;
            let metadata:Prisma.InputJsonValue | undefined;
            let bookingDraft:Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;

            if(isBookingMessage){
                const orderResult = await this.prepareBookingOrders(
                    tx,
                    userId,
                    sessionId,
                    bookingAnalyses
                );

                answer = orderResult.answer;
                metadata = orderResult.metadata;
                bookingDraft = orderResult.bookingDraft;
            }

            const assistantMessage =
            await tx.chatMessage.create({
                data:{
                    userId,
                    sessionId,
                    role:ChatRole.ASSISTANT,
                    content:answer,
                    metadata
                },
                include:{
                    attachments:true
                }
            });

            await tx.chatSession.update({
                where:{
                    id:session.id
                },
                data:{
                    updatedAt:new Date(),
                    bookingDraft,
                    title:session.title === 'New chat'
                    ? text.slice(0,18)
                    : session.title
                }
            });

            return {
                userMessage,
                assistantMessage
            };
        });

    }

    async confirmOrder(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        return this.prisma.$transaction(async (tx) => {
            await this.findOwnedSessionInTransaction(
                tx,
                userId,
                sessionId
            );

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

            if(order.status !== OrderStatus.PENDING_CONFIRM){
                throw new BadRequestException('Order is not pending confirmation');
            }

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
                    sessionId,
                    role:ChatRole.SYSTEM,
                    content:`Order ${updatedOrder.orderNo} confirmed. Please continue to payment.`,
                    metadata:{
                        type:'ORDER_CONFIRMED',
                        orderId:updatedOrder.id,
                        orderNo:updatedOrder.orderNo,
                        orderSnapshot:this.orderService.createOrderSnapshot(updatedOrder)
                    } as Prisma.InputJsonValue
                }
            });

            await tx.chatSession.update({
                where:{
                    id:sessionId
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

    async cancelOrder(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        return this.prisma.$transaction(async (tx) => {
            await this.findOwnedSessionInTransaction(
                tx,
                userId,
                sessionId
            );

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

            if(order.status === OrderStatus.CANCELED || order.status === OrderStatus.COMPLETED){
                throw new BadRequestException('Order cannot be canceled');
            }

            const updatedOrder = await tx.order.update({
                where:{
                    id:orderId
                },
                data:{
                    status:OrderStatus.CANCELED,
                    canceledAt:new Date()
                }
            });

            const systemMessage = await tx.chatMessage.create({
                data:{
                    userId,
                    sessionId,
                    role:ChatRole.SYSTEM,
                    content:`Order ${updatedOrder.orderNo} canceled.`,
                    metadata:{
                        type:'ORDER_CANCELED',
                        orderId:updatedOrder.id,
                        orderNo:updatedOrder.orderNo,
                        orderSnapshot:this.orderService.createOrderSnapshot(updatedOrder)
                    } as Prisma.InputJsonValue
                }
            });

            await tx.chatSession.update({
                where:{
                    id:sessionId
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

    async payOrder(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        await this.findOwnedSession(
            userId,
            sessionId
        );

        return this.orderService.payFromChat(
            userId,
            sessionId,
            orderId
        );
    }

    async completeOrder(
        userId:string,
        sessionId:string,
        orderId:string
    ){
        await this.findOwnedSession(
            userId,
            sessionId
        );

        return this.orderService.completeFromChat(
            userId,
            sessionId,
            orderId
        );
    }


    private async findOwnedSession(
        userId:string,
        sessionId:string
    ){

        const session =
        await this.prisma.chatSession.findFirst({
            where:{
                id:sessionId,
                userId
            }
        });

        if(!session){
            throw new NotFoundException(
                'Chat session not found'
            );
        }

        return session;

    }

    private async findOwnedSessionInTransaction(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string
    ){
        const session =
        await tx.chatSession.findFirst({
            where:{
                id:sessionId,
                userId
            }
        });

        if(!session){
            throw new NotFoundException(
                'Chat session not found'
            );
        }

        return session;
    }

    private async analyzeBookingIntents(
        content:string,
        currentDraft:any
    ):Promise<BookingAnalysis[]>{
        try {
            const response = await this.openai.responses.create({
                model:'gpt-4.1-mini',
                input:[
                    {
                        role:'system',
                        content:[
                            'You extract one or more travel booking intents from chat messages.',
                            'Return only JSON with this shape:',
                            '{"bookings":[{"intent":"FLIGHT|HOTEL","slots":{},"missingSlots":[],"isModification":false,"isPriceQuestion":false}]}',
                            'If there is no booking intent, return {"bookings":[]}.',
                            'If one message contains both a flight and a hotel, return two booking objects.',
                            'For FLIGHT slots use: from,to,date,passenger,totalAmount.',
                            'For HOTEL slots use: city,checkIn,checkOut,guests,hotelName,roomType,totalAmount.',
                            'You may reuse obvious context inside the same message, for example hotel city can be the flight destination.',
                            'Merge the user message with the existing draft when possible.',
                            'If the message is changing a previous booking, set isModification true.',
                            'If the user asks for price, fare, quote, cost, or how much, set isPriceQuestion true.',
                            'Do not create or imply a final price if totalAmount is unknown.',
                            'If the message is only a general follow-up such as "what?" and does not add or modify booking slots, keep the existing draft slots but do not invent new values.',
                            'Use null for unknown values and do not invent dates or locations.'
                        ].join('\n')
                    },
                    {
                        role:'user',
                        content:JSON.stringify({
                            currentDraft,
                            message:content
                        })
                    }
                ]
            });

            const parsed = this.parseJsonResponse(response.output_text);
            return this.normalizeBookingAnalyses(parsed);
        } catch {
            return this.createFallbackBookingAnalyses(
                content,
                currentDraft
            );
        }
    }

    private parseJsonResponse(text:string){
        const cleaned = text
        .replace(/^```json/i,'')
        .replace(/^```/,'')
        .replace(/```$/,'')
        .trim();

        return JSON.parse(cleaned);
    }

    private normalizeBookingAnalyses(value:any):BookingAnalysis[]{
        const bookings = Array.isArray(value?.bookings)
        ? value.bookings
        : value?.intent
        ? [value]
        : [];

        return bookings
        .map((booking) => this.normalizeBookingAnalysis(booking))
        .filter((booking) => booking.intent !== 'NONE');
    }

    private normalizeBookingAnalysis(value:any):BookingAnalysis{
        const intent:BookingIntent = value?.intent === 'FLIGHT' || value?.intent === 'HOTEL'
        ? value.intent
        : 'NONE';

        if(intent === 'NONE'){
            return {
                intent:'NONE',
                slots:{},
                missingSlots:[],
                isModification:false,
                isPriceQuestion:false
            };
        }

        const slots = value?.slots && typeof value.slots === 'object'
        ? value.slots
        : {};

        const missingSlots = this.getMissingBookingSlots(
            intent,
            slots
        );

        return {
            intent,
            slots,
            missingSlots,
            isModification:Boolean(value?.isModification),
            isPriceQuestion:Boolean(value?.isPriceQuestion)
        };
    }

    private createFallbackBookingAnalyses(
        content:string,
        currentDraft:any
    ):BookingAnalysis[]{
        const lower = content.toLowerCase();
        const hasFlightIntent = /flight|ticket|plane|机票|航班|飞机/.test(lower);
        const hasHotelIntent = /hotel|room|stay|酒店|房间|入住/.test(lower);

        const intents:BookingIntent[] = [];

        if(hasFlightIntent){
            intents.push('FLIGHT');
        }

        if(hasHotelIntent){
            intents.push('HOTEL');
        }

        return intents.map((intent) => {
            const slots = this.getDraftSlotsForIntent(
                currentDraft,
                intent
            );

            const missingSlots = this.getMissingBookingSlots(
                intent,
                slots
            );

            return {
                intent,
                slots,
                missingSlots,
                isModification:/change|modify|update|改|换|调整/.test(lower),
                isPriceQuestion:/price|fare|quote|cost|how much|多少钱|价格|报价|票价|费用/.test(lower)
            };
        });
    }

    private getDraftSlotsForIntent(
        currentDraft:any,
        intent:BookingIntent
    ){
        if(!currentDraft){
            return {};
        }

        if(Array.isArray(currentDraft.items)){
            return currentDraft.items.find((item) => item.intent === intent)?.slots ?? {};
        }

        if(currentDraft.intent === intent){
            return currentDraft.slots ?? {};
        }

        return {};
    }

    private getMissingBookingSlots(
        intent:BookingIntent,
        slots:Record<string,unknown>
    ){
        const requiredSlots = intent === 'FLIGHT'
        ? ['from','to','date','passenger','totalAmount']
        : intent === 'HOTEL'
        ? ['city','checkIn','checkOut','guests','hotelName','roomType','totalAmount']
        : [];

        return requiredSlots.filter((key) => {
            const value = slots[key];
            return value === undefined || value === null || String(value).trim() === '';
        });
    }

    private createBookingAnswer(analysis:BookingAnalysis){
        if(analysis.missingSlots.length > 0){
            if(analysis.missingSlots.includes('totalAmount')){
                return [
                    'I have the booking details saved as a draft, but I cannot create a pending order until there is a price.',
                    analysis.isPriceQuestion
                    ? 'Live pricing is not connected yet, so I cannot calculate the fare automatically.'
                    : 'The price is still missing.',
                    'Please provide a quoted price, or connect a pricing/search API later so I can fill it automatically.'
                ].join('\n');
            }

            return [
                'I can help create this booking. I still need:',
                this.formatMissingSlots(analysis.missingSlots).join(', ')
            ].join('\n');
        }

        return 'The booking information is complete. I created a pending confirmation order for you.';
    }

    private formatMissingSlots(slots:string[]){
        const labels:Record<string,string> = {
            from:'departure city',
            to:'destination',
            date:'travel date',
            passenger:'number of passengers',
            city:'destination city',
            checkIn:'check-in date',
            checkOut:'check-out date',
            guests:'number of guests',
            hotelName:'hotel name',
            roomType:'room type',
            totalAmount:'price'
        };

        return slots.map((slot) => labels[slot] ?? slot);
    }

    private async prepareBookingOrders(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string,
        analyses:BookingAnalysis[]
    ){
        if(analyses.length === 1){
            return this.prepareBookingOrder(
                tx,
                userId,
                sessionId,
                analyses[0]
            );
        }

        const results:Array<{
            answer:string;
            metadata:Prisma.InputJsonValue;
            bookingDraft:Prisma.InputJsonValue;
        }> = [];

        for(const analysis of analyses){
            results.push(
                await this.prepareBookingOrder(
                    tx,
                    userId,
                    sessionId,
                    analysis
                )
            );
        }

        const orderItems = results
        .map((result) => {
            const metadata = result.metadata as any;

            if(!metadata?.orderId){
                return null;
            }

            return {
                orderId:metadata.orderId,
                orderNo:metadata.orderNo,
                orderSnapshot:metadata.orderSnapshot,
                booking:metadata.booking
            };
        })
        .filter(Boolean);

        const bookingItems = results
        .map((result) => {
            const metadata = result.metadata as any;
            return metadata?.booking;
        })
        .filter(Boolean);

        return {
            answer:results
            .map((result,index) => {
                const intent = analyses[index].intent === 'FLIGHT'
                ? 'Flight'
                : 'Hotel';

                return `${intent}: ${result.answer}`;
            })
            .join('\n\n'),
            metadata:{
                type:'BOOKING_BATCH',
                orderItems,
                bookingItems
            } as Prisma.InputJsonValue,
            bookingDraft:{
                items:bookingItems,
                updatedAt:new Date().toISOString()
            } as Prisma.InputJsonValue
        };
    }

    private async prepareBookingOrder(
        tx:Prisma.TransactionClient,
        userId:string,
        sessionId:string,
        analysis:BookingAnalysis
    ){
        const draft:BookingDraft = {
            intent:analysis.intent,
            slots:analysis.slots,
            missingSlots:analysis.missingSlots,
            status:analysis.missingSlots.length > 0 ? 'COLLECTING' : 'READY',
            updatedAt:new Date().toISOString()
        };

        if(analysis.missingSlots.length > 0){
            return {
                answer:this.createBookingAnswer(analysis),
                metadata:{
                    type:'BOOKING_DRAFT',
                    booking:draft
                } as Prisma.InputJsonValue,
                bookingDraft:draft as Prisma.InputJsonValue
            };
        }

        const orderType = analysis.intent === 'FLIGHT'
        ? OrderType.FLIGHT
        : OrderType.HOTEL;

        const totalAmount = Number(analysis.slots.totalAmount || 0);

        const order =
        await this.orderService.preparePendingOrderFromChat(
            tx,
            userId,
            sessionId,
            orderType,
            Number.isFinite(totalAmount) ? totalAmount : 0,
            analysis.slots
        );

        draft.orderId = order.id;
        draft.orderNo = order.orderNo;

        return {
            answer:[
                analysis.isModification
                ? 'I updated the pending order with your latest booking details.'
                : 'The booking information is complete. I created a pending confirmation order for you.',
                `Order No: ${order.orderNo}`,
                'Please confirm it in this chat when you are ready.'
            ].join('\n'),
            metadata:{
                type:'ORDER_PREVIEW',
                orderId:order.id,
                orderNo:order.orderNo,
                orderSnapshot:this.orderService.createOrderSnapshot(order),
                booking:draft
            } as Prisma.InputJsonValue,
            bookingDraft:draft as Prisma.InputJsonValue
        };
    }

    private async createAiAnswer(
        messages:{role:ChatRole;content:string}[],
        attachments:{fileUrl:string}[] = []
    ){

    const fileInputs =
    await Promise.all(
        attachments.map(async (attachment) => {
            const filePath = join(
                process.cwd(),
                'public',
                attachment.fileUrl.replace(/^\/uploads\//,'uploads/')
            );

            const uploadedFile =
            await this.openai.files.create({
                file:fs.createReadStream(filePath),
                purpose:'user_data'
            });

            return {
                type:'input_file',
                file_id:uploadedFile.id
            };
        })
    );

    const input = messages.map((message,index) => {
        const isLastMessage = index === messages.length - 1;
        const role = message.role === ChatRole.USER
        ? 'user'
        : 'assistant';

        if(!isLastMessage || message.role !== ChatRole.USER || fileInputs.length === 0){
            return {
                role,
                content:message.content
            };
        }

        return {
            role,
            content:[
                {
                    type:'input_text',
                    text:message.content
                },
                ...fileInputs
            ]
        };
    });

    const response = await this.openai.responses.create({
        model:'gpt-4.1-mini',
        input:input as any
    });

    return response.output_text || 'No response';

    }

}
