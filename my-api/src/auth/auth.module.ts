import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  
   imports:[
    JwtModule.register({
      secret:process.env.JWT_SECRET,
      signOptions:{
        expiresIn:'2h'
      }
    })
  ],

  controllers: [AuthController],
  providers: [AuthService,JwtAuthGuard],
  exports:[JwtModule,JwtAuthGuard]
})
export class AuthModule {}
