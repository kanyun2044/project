import { Controller,Post,Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){}


    @Post('register')register(@Body() data:RegisterDto)
    {

        return this.authService.register(
            data.email, 
            data.password,
            data.phoneNumber
        );

    }

    @Post('login')login(@Body() data){
        return this.authService.login(
            data.email,
            data.password
            

        )


    }


    @Post('refresh')refresh(@Body() data:RefreshTokenDto){
        return this.authService.refreshToken(data.refreshToken);

    }


}

