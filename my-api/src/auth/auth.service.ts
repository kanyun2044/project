import { Injectable, UnauthorizedException,ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';




@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService 
  ) {}


    async register(email: string, password: string,phoneNumber:string,userName:string) { 
        const hashPassword = await bcrypt.hash(password,10);

        const emailFounder = await this.prisma.user.findUnique({
          where: {email:email}
        });
        
        if(emailFounder){
          throw new ConflictException("Email already exists")
        }

         const phoneNumberFounder = await this.prisma.user.findUnique({
          where: {phoneNumber}
        });
        
        if(phoneNumberFounder){
          throw new ConflictException("Phonenumber already exists")
        }
        


        const user = await this.prisma.user.create({
        data:{
            email:email,
            username:userName,
            passwordHash:hashPassword,
            phoneNumber:phoneNumber
        },
       
    });

    return {id:user.id,username:user.username,email:user.email,
        phoneNumber:user.phoneNumber};
    
  }

  async login(email:string,password:string){
    const user = await this.prisma.user.findUnique({
      where: {email:email}
    })
    if(!user){
      throw new UnauthorizedException("User not found");
    }

    if (user.isDelete) {
      throw new UnauthorizedException('User has been deleted');
    }

    const passwordMatch = await bcrypt.compare(password,user.passwordHash);

    if(!passwordMatch){
      throw new UnauthorizedException("Password incorrect")
    }
    
    
      
    
  const payload = {sub:user.id,email:user.email};


  const accessToken = this.jwtService.sign(payload,{expiresIn:'2h'});

  const refreshToken = this.jwtService.sign(payload,{expiresIn:'7d'});

  const hashedRefreshToken = await bcrypt.hash(refreshToken,10);


  await this.prisma.user.update({where:{id:user.id},data:{refreshToken:hashedRefreshToken}});



  return {user:{id:user.id, email:user.email, username:user.username
    },

    accessToken,
    refreshToken


  };
  }

    async refreshToken(refreshToken:string){
    
    let payload;
    try{payload =this.jwtService.verify(refreshToken);}
    catch(e){
       throw new UnauthorizedException(
        "Invalid refresh token"
        );

    }

    const user = await this.prisma.user.findUnique({where:{id:payload.sub,isDelete:false}});

    if(!user || !user.refreshToken){
      throw new UnauthorizedException("Invalid refreshToken");
    }
  
    const isMatch =await bcrypt.compare(refreshToken,user.refreshToken);

    if(!isMatch){
      throw new UnauthorizedException("Invalid refreshToken");
    }

    const newAccessToken = this.jwtService.sign({sub:user.id,email:user.email},{expiresIn:'2h'});
    
    return{accessToken:newAccessToken};
  }


}