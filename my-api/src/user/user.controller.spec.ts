/// <reference types="jest" />
import { UserController } from './user.controller';

describe('UserController', () => {
    let controller:UserController;
    let userService:any;

    beforeEach(() => {
        userService = {
            getProfile:jest.fn()
        };
        controller = new UserController(userService);
    });

    it('is defined', () => {
        expect(controller).toBeDefined();
    });

    it('loads the current user from the JWT context', () => {
        controller.getProfile({
            user:{sub:'user-1'}
        });

        expect(userService.getProfile).toHaveBeenCalledWith('user-1');
    });
});
