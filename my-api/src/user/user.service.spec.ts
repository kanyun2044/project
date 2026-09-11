/// <reference types="jest" />
import { UserService } from './user.service';

describe('UserService', () => {
    let service:UserService;

    beforeEach(() => {
        const prisma = {
            user:{
                findFirst:jest.fn(),
                findUnique:jest.fn(),
                update:jest.fn()
            }
        };

        service = new UserService(prisma as any);
    });

    it('is defined', () => {
        expect(service).toBeDefined();
    });
});
