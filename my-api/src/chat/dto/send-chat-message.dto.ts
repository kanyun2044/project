import { Type } from 'class-transformer';
import { IsArray,IsNumber,IsOptional,IsString,MinLength,ValidateNested } from 'class-validator';

class ChatAttachmentDto {
    @IsString()
    fileName:string;

    @IsString()
    fileUrl:string;

    @IsString()
    mimeType:string;

    @IsNumber()
    fileSize:number;
}

export class SendChatMessageDto {
    @IsString()
    @MinLength(1)
    content:string;

    @IsOptional()
    @IsArray()
    @ValidateNested({each:true})
    @Type(() => ChatAttachmentDto)
    attachments?:ChatAttachmentDto[];
}
