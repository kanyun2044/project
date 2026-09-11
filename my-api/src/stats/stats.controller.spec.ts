/// <reference types="jest" />
import { StatsController } from './stats.controller';

describe('StatsController', () => {
    let controller:StatsController;
    let statsService:any;

    beforeEach(() => {
        statsService = {
            getSummary:jest.fn(),
            getOrderDistribution:jest.fn()
        };
        controller = new StatsController(statsService);
    });

    it('always uses the manager id from the JWT context', () => {
        const query = {
            startDate:'2026-09-01',
            endDate:'2026-09-02',
            dimension:'day'
        };

        controller.getSummary(
            {user:{sub:'manager-from-token'}},
            query
        );

        expect(statsService.getSummary).toHaveBeenCalledWith(
            'manager-from-token',
            query
        );
    });
});
