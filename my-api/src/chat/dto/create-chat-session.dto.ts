import { IsOptional,IsString,MaxLength } from 'class-validator';

export class CreateChatSessionDto {
    @IsOptional()
    @IsString()
    @MaxLength(80)
    title?:string;
}
