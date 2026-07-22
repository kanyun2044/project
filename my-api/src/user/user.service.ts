import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from 'src/user/dto/update-user.dto'; 
import * as bcrypt from 'bcrypt';
import { RefreshTokenDto } from 'src/auth/dto/refresh-token.dto';
import { ConflictException,BadRequestException } from '@nestjs/common';


@Injectable()
export class UserService {


    constructor(
    private prisma:PrismaService){}

async getProfile(userId:string){


 const user =
 await this.prisma.user.findFirst({
    where:{
      id:userId,
      isDelete:false
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

  const existingUser = await this.prisma.user.findFirst({
    where:{
      id:userId,
      isDelete:false
    }
  });

  if(!existingUser){
    throw new NotFoundException("User not found");
  }

  if (data.phoneNumber) {
  const phoneOwner = await this.prisma.user.findUnique({
    where: {
      phoneNumber: data.phoneNumber
    }
  });

  if (phoneOwner && phoneOwner.id !== userId) {
    throw new ConflictException(
      "Phone number already exists"
      );
    }
  }


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
    const user = await this.prisma.user.findFirst({
      where:{
        id:userId,
        isDelete:false
      }
    });
    
    if(!user){
      throw new NotFoundException("User not found");}

    const match =await bcrypt.compare(oldPassword,user.passwordHash);

    if(!match){
      throw new UnauthorizedException("old password Incorrect")
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException(
      "New password cannot be the same as old password",
      );
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

    const user = await this.prisma.user.findFirst({
        where:{
            id:userId,
            isDelete:false
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


