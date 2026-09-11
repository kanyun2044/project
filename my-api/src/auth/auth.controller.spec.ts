/// <reference types="jest" />
import { AuthController } from './auth.controller';

describe('AuthController', () => {
    let controller:AuthController;
    let authService:any;

    beforeEach(() => {
        authService = {
            register:jest.fn()
        };
        controller = new AuthController(authService);
    });

    it('is defined', () => {
        expect(controller).toBeDefined();
    });

    it('passes register data to the service', () => {
        const data = {
            email:'test@example.com',
            password:'Password123',
            confirmPassword:'Password123',
            phoneNumber:'1234567890',
            username:'Test User'
        };

        controller.register(data);

        expect(authService.register).toHaveBeenCalledWith(
            data.email,
            data.password,
            data.phoneNumber,
            data.username
        );
    });
});
