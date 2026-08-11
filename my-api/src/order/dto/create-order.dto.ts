import { OrderType } from '@prisma/client';
import { IsEnum,IsNumber,IsObject,IsOptional,IsString,Min } from 'class-validator';

export class CreateOrderDto {
    @IsEnum(OrderType)
    type:OrderType;

    @IsNumber()
    @Min(0)
    totalAmount:number;

    @IsObject()
    bookingDetails:Record<string,unknown>;

    @IsOptional()
    @IsString()
    chatSessionId?:string;

    @IsOptional()
    @IsString()
    paymentMethod?:string;
}
