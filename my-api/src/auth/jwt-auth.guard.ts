import {CanActivate,ExecutionContext,Injectable,UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';


@Injectable()
export class JwtAuthGuard implements CanActivate {


constructor(private jwtService: JwtService,private reflector: Reflector){}


async canActivate(context:ExecutionContext):Promise<boolean>{


    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,
        [
            context.getHandler(),
            context.getClass()
        ]
    );


    if(isPublic){
        return true;
    }


    const request =context.switchToHttp().getRequest();


    const authHeader = request.headers.authorization;


    if(!authHeader){
        throw new UnauthorizedException(
            "Missing token"
        );
    }


    const [type, token] = authHeader.split(' ');

    if(type !== 'Bearer' || !token){
        
        throw new UnauthorizedException(
        "Invalid authorization format"
    );
}


    try{

        const payload =
        this.jwtService.verify(token);


        request.user = payload;


        return true;

    }catch{

        throw new UnauthorizedException(
            "Invalid token"
        );

    }

}

}