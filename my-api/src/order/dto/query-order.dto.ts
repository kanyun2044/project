import { OrderStatus,OrderType } from '@prisma/client';
import { IsEnum,IsOptional,IsString } from 'class-validator';

export class QueryOrderDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?:OrderStatus;

    @IsOptional()
    @IsEnum(OrderType)
    type?:OrderType;

    @IsOptional()
    @IsString()
    page?:string;

    @IsOptional()
    @IsString()
    pageSize?:string;
}
