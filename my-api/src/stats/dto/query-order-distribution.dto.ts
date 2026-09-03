import { IsOptional,IsString } from 'class-validator';

export class QueryOrderDistributionDto {
    @IsOptional()
    @IsString()
    startDate?:string;

    @IsOptional()
    @IsString()
    endDate?:string;
}
