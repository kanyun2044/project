import {IsEmail,IsString,MinLength,IsOptional, IsPhoneNumber,Matches} from 'class-validator';
import { Match } from '../../common/validators/match.decorator';


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

@IsString()
@MinLength(6)
@Match('password', {
  message: 'confirmPassword must match password'
})
confirmPassword!: string;

}
