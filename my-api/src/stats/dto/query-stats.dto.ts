import { IsOptional,IsString } from 'class-validator';

export enum StatsDimension {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month'
}

export class QueryStatsDto {
    @IsOptional()
    @IsString()
    startDate?:string;

    @IsOptional()
    @IsString()
    endDate?:string;

    @IsOptional()
    @IsString()
    dimension?:string;
}
