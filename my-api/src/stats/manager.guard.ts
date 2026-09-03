import { CanActivate,ExecutionContext,ForbiddenException,Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class ManagerGuard implements CanActivate {
    canActivate(context:ExecutionContext){
        const request = context.switchToHttp().getRequest();

        if(request.user?.role !== UserRole.MANAGER){
            throw new ForbiddenException('Manager access required');
        }

        return true;
    }
}
