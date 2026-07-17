import {IsEmail,IsString,MinLength,IsOptional, IsPhoneNumber} from 'class-validator';


export class RegisterDto {


 @IsEmail()
 email!:string;


 @IsString()
 @MinLength(6)
 password!:string;



 @IsString()
 @IsPhoneNumber('CN')
 phoneNumber!:string;

@IsString()
username!: string;



}
