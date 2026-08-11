import { Body,Controller,Delete,Get,Param,Patch,Post,Query,Req } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
    constructor(private orderService:OrderService){}

    @Post()
    createOrder(@Req() request,@Body() data:CreateOrderDto){
        return this.orderService.createOrder(
            request.user.sub,
            data
        );
    }

    @Get()
    getOrders(@Req() request,@Query() query:QueryOrderDto){
        return this.orderService.getOrders(
            request.user.sub,
            query
        );
    }

    @Get(':id')
    getOrder(@Req() request,@Param('id') id:string){
        return this.orderService.getOrder(
            request.user.sub,
            id
        );
    }

    @Patch(':id/status')
    updateStatus(
        @Req() request,
        @Param('id') id:string,
        @Body() data:UpdateOrderStatusDto
    ){
        return this.orderService.updateStatus(
            request.user.sub,
            id,
            data
        );
    }

    @Delete(':id')
    deleteOrder(@Req() request,@Param('id') id:string){
        return this.orderService.deleteOrder(
            request.user.sub,
            id
        );
    }
}
