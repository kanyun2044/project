/// <reference types="jest" />
import { ChatController } from './chat.controller';

describe('ChatController', () => {
    let controller:ChatController;
    let chatService:any;

    beforeEach(() => {
        chatService = {
            createSession:jest.fn(),
            getMessages:jest.fn(),
            payOrder:jest.fn()
        };
        controller = new ChatController(chatService);
    });

    it('creates a chat for the current user', () => {
        const data = {
            title:'Travel plan'
        };

        controller.createSession(
            {user:{sub:'user-1'}},
            data
        );

        expect(chatService.createSession).toHaveBeenCalledWith(
            'user-1',
            data
        );
    });

    it('loads messages from the selected chat', () => {
        controller.getMessages(
            {user:{sub:'user-1'}},
            'chat-1'
        );

        expect(chatService.getMessages).toHaveBeenCalledWith(
            'user-1',
            'chat-1'
        );
    });

    it('sends a pay action to the chat service', () => {
        controller.payOrder(
            {user:{sub:'user-1'}},
            'chat-1',
            'order-1'
        );

        expect(chatService.payOrder).toHaveBeenCalledWith(
            'user-1',
            'chat-1',
            'order-1'
        );
    });
});
