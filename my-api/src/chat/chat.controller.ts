import { Body,Controller,Delete,Get,Param,Patch,Post,Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';

@Controller('chats')
export class ChatController {
    constructor(private chatService:ChatService){}

    @Get()
    getSessions(@Req() request){
        return this.chatService.getSessions(
            request.user.sub
        );
    }

    @Post()
    createSession(@Req() request,@Body() data:CreateChatSessionDto){
        return this.chatService.createSession(
            request.user.sub,
            data
        );
    }

    @Patch(':id')
    updateSession(
        @Req() request,
        @Param('id') id:string,
        @Body() data:UpdateChatSessionDto
    ){
        return this.chatService.updateSession(
            request.user.sub,
            id,
            data
        );
    }

    @Delete(':id')
    deleteSession(@Req() request,@Param('id') id:string){
        return this.chatService.deleteSession(
            request.user.sub,
            id
        );
    }

    @Get(':id/messages')
    getMessages(@Req() request,@Param('id') id:string){
        return this.chatService.getMessages(
            request.user.sub,
            id
        );
    }

    @Post(':id/messages')
    sendMessage(
        @Req() request,
        @Param('id') id:string,
        @Body() data:SendChatMessageDto
    ){
        return this.chatService.sendMessage(
            request.user.sub,
            id,
            data.content
        );
    }
}
