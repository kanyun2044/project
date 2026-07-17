import { Controller,Get,Patch, Body,Req, UseGuards,Post} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Delete } from '@nestjs/common';

@Controller('users')
export class UserController {
    constructor(
        private userService:UserService){}
    
    
    
    
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req()req){

        return this.userService.getProfile(
            req.user.sub);}


    @Patch('me')
    updateProfile(
    @Body() data:UpdateUserDto ){
    return this.userService.updateProfile(
        '042d5bf8-1047-42a1-b2da-2f5a967cf668',
        data
    );
    
    }

    @Post('me/password')
    changePassword(
    @Body() data:ChangePasswordDto
    ){

    return this.userService.changePassword(
        '042d5bf8-1047-42a1-b2da-2f5a967cf668',
        data.oldPassword,
        data.newPassword
    );

    }

    @Delete('me')
    cdeleteAccount(){

    return this.userService.deleteAccount(
        '042d5bf8-1047-42a1-b2da-2f5a967cf668'
    );

}
}


