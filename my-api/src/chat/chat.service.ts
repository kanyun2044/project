import { Injectable,NotFoundException } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import OpenAI from 'openai';
import * as fs from 'fs';
import { join } from 'path';


@Injectable()
export class ChatService {

    private openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    constructor(private prisma:PrismaService){}


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

        const userMessage =
        await this.prisma.chatMessage.create({
            data:{
                userId,
                sessionId,
                role:ChatRole.USER,
                content:text,
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

        const answer = await this.createAiAnswer(
            contextMessages.reverse(),
            userMessage.attachments
        );

        const assistantMessage =
        await this.prisma.chatMessage.create({
            data:{
                userId,
                sessionId,
                role:ChatRole.ASSISTANT,
                content:answer
            },
            include:{
                attachments:true
            }
        });

        await this.prisma.chatSession.update({
            where:{
                id:session.id
            },
            data:{
                updatedAt:new Date(),
                title:session.title === 'New chat'
                ? text.slice(0,18)
                : session.title
            }
        });

        return {
            userMessage,
            assistantMessage
        };

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


    private createMockAnswer(content:string){

        return `This is a mock test for: "${content}". The real AI service can be connected here later.`;

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
