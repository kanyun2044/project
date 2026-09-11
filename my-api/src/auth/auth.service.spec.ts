/// <reference types="jest" />
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service:AuthService;

    beforeEach(() => {
        const prisma = {
            user:{
                findUnique:jest.fn(),
                create:jest.fn(),
                update:jest.fn()
            }
        };
        const jwtService = {
            sign:jest.fn(),
            verify:jest.fn()
        };

        service = new AuthService(
            prisma as any,
            jwtService as any
        );
    });

    it('is defined', () => {
        expect(service).toBeDefined();
    });
});
