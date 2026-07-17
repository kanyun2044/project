import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from 'src/user/dto/update-user.dto'; 
import * as bcrypt from 'bcrypt';
import { RefreshTokenDto } from 'src/auth/dto/refresh-token.dto';


@Injectable()
export class UserService {


    constructor(
    private prisma:PrismaService){}

async getProfile(userId:string){


 const user =
 await this.prisma.user.findUnique({
    where:{
      id:userId
    }
 });

  if(!user){
   throw new NotFoundException("User not found");
 }


 return {id:user.id,username:user.username,email:user.email,
    phoneNumber:user.phoneNumber,avatar:user.avatar};

}

async updateProfile(
  userId:string,
  data:UpdateUserDto
){

  const user = await this.prisma.user.update({

    where:{
      id:userId
    },

    data:{
      username:data.username,
      phoneNumber:data.phoneNumber,
      avatar:data.avatar
    }

  });


  return {
    id:user.id,
    username:user.username,
    email:user.email,
    phoneNumber:user.phoneNumber,
    avatar:user.avatar
  };

}
  async changePassword(userId:string,oldPassword:string,newPassword:string){
    const user = await this.prisma.user.findUnique({where:{id:userId}});
    
    if(!user){
      throw new NotFoundException("User not found");}

    const match =await bcrypt.compare(oldPassword,user.passwordHash);

    if(!match){
      throw new UnauthorizedException("old password Incorrect")
    }

    const hashPassword = await bcrypt.hash(newPassword,10);

    await this.prisma.user.update({
      where:{id:userId},
      data:{passwordHash:hashPassword,refreshToken:null}
    });


    return {
      message: "password update successfully"
    };
  }


  async deleteAccount(userId:string){

    const user = await this.prisma.user.findUnique({
        where:{
            id:userId
        }
    });


    if(!user){
        throw new NotFoundException(
            "User not found"
        );
    }


    await this.prisma.user.update({
        where:{
            id:userId
        },
        data:{
            isDelete:true,
            deleteAt:new Date(),
            refreshToken:null
        }
    });


    return {
        message:"Account deleted successfully"
    };

}

}


