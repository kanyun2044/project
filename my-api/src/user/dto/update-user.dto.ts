import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';


export class UpdateUserDto {

  @IsOptional()
  @IsString()
  username?: string;


  @IsOptional()
 @IsPhoneNumber('CN')
  phoneNumber?: string;


  @IsOptional()
  @IsString()
  avatar?: string;

}