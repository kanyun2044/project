import { Controller,Get,Patch, Body,Req, UseGuards,Post} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Delete } from '@nestjs/common';

@Controller('users')
export class UserController {
    constructor(
        private userService:UserService){}
    
    
    
    
    @Get('me')
    getProfile(@Req()req){

        return this.userService.getProfile(
            req.user.sub);}


    @Patch('me')
    updateProfile(
    @Req() req,
    @Body() data:UpdateUserDto ){
    return this.userService.updateProfile(
        req.user.sub,
        data
    );
    
    }

    @Post('me/password')
    changePassword(
        @Req() req,
        @Body() data:ChangePasswordDto
    ){

    return this.userService.changePassword(
        req.user.sub,
        data.oldPassword,
        data.newPassword
    );

    }

    @Delete('me')
    cdeleteAccount(@Req() req,){

    return this.userService.deleteAccount(
        req.user.sub
    );

}
}


