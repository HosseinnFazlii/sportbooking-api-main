import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiPropertyOptional({ description: 'Gateway reference / transaction id' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class FailPaymentDto {
  @ApiPropertyOptional({ description: 'Gateway reference / transaction id' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Reason for the payment failure' })
  @IsOptional()
  @IsString()
  reason?: string;
}
