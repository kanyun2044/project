import { OrderStatus } from '@prisma/client';
import { IsEnum,IsOptional,IsString } from 'class-validator';

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status:OrderStatus;

    @IsOptional()
    @IsString()
    paymentMethod?:string;

    @IsOptional()
    @IsString()
    paymentNo?:string;
}
