import { Controller,Get,Patch, Body,Req, UseGuards,Post,Res,} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Delete } from '@nestjs/common';
import type { Response } from "express";

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

    @Post("me/password")
        async changePassword(@Req() request,@Body() data: ChangePasswordDto,@Res({ passthrough: true }) response: Response,) {
        const result = await this.userService.changePassword(
        request.user.sub,
        data.oldPassword,
        data.newPassword,
    );

        response.clearCookie("access_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
    });

        response.clearCookie("refresh_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
    });

    return result;
    }

    @Delete("me")
    async deleteAccount(@Req() request,@Res({ passthrough: true }) response: Response,) {
        const result = await this.userService.deleteAccount(
        request.user.sub,
    );

        response.clearCookie("access_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
    });

        response.clearCookie("refresh_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
    });

        return result;
    }
}


