import { IsString,MaxLength,MinLength } from 'class-validator';

export class UpdateChatSessionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    title:string;
}
