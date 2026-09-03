import { ExecutionContext,ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ManagerGuard } from './manager.guard';

describe('ManagerGuard', () => {
    const guard = new ManagerGuard();

    function createContext(role?:UserRole){
        return {
            switchToHttp:() => ({
                getRequest:() => ({
                    user:{role}
                })
            })
        } as ExecutionContext;
    }

    it('allows a manager', () => {
        expect(
            guard.canActivate(createContext(UserRole.MANAGER))
        ).toBe(true);
    });

    it('rejects a normal user', () => {
        expect(() => {
            guard.canActivate(createContext(UserRole.USER));
        }).toThrow(ForbiddenException);
    });
});
