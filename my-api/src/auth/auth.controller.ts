import { Controller,Post,Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { Req, Res,  UnauthorizedException,} from "@nestjs/common";
import type { Request, Response } from "express";


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){}

    @Public()
    @Post('register')register(@Body() data:RegisterDto)
    {

        return this.authService.register(
            data.email, 
            data.password,
            data.phoneNumber,
            data.username
        );

    }

    @Public()   
    @Post("login")
    async login(@Body() data: LoginDto,@Res({ passthrough: true }) response: Response,) {
        const result = await this.authService.login(
        data.email,
        data.password,
    );

        response.cookie("access_token", result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
        });

        response.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {user: result.user,};
    }

    @Public()
    @Post("refresh")
    async refresh(@Req() request: Request,@Res({ passthrough: true }) response: Response,) {
        const refreshToken = request.cookies?.refresh_token;

        if (!refreshToken) {
        throw new UnauthorizedException(
        "Missing refresh token",
    );
  }

        const result =
        await this.authService.refreshToken(refreshToken);

        response.cookie("access_token", result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
    });

        return {message: "Access token refreshed",};
    }

    @Post("logout")
    async logout(
    @Req() request: any,
    @Res({ passthrough: true }) response: Response,
    ) {
    const result = await this.authService.logout(
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

