/// <reference types="jest" />
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
    it('is defined', () => {
        const service = new PrismaService();

        expect(service).toBeDefined();
    });
});
