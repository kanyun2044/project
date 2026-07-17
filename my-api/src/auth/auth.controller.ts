import { Controller,Post,Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';

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
    @Post('login')login(@Body() data:LoginDto){

        return this.authService.login(
        data.email,
        data.password
        );

    }

    @Public()
    @Post('refresh')refresh(@Body() data:RefreshTokenDto){
        return this.authService.refreshToken(data.refreshToken);

    }


}

