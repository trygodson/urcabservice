import { Controller, Get, Query, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAdminAuthGuard, Role, SetRolesMetaData } from '@urcab-workspace/shared';
import { PassengerTransactionsService } from './passenger-transactions.service';
import { GetPassengerTransactionsDto, ExportFormat, PassengerTransactionsListResponseDto } from './dto';

@ApiTags('Admin - Passenger Transactions')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/passenger-transactions')
export class PassengerTransactionsController {
  constructor(private readonly passengerTransactionsService: PassengerTransactionsService) {}

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get paginated passenger transactions with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Passenger transactions retrieved successfully',
    type: PassengerTransactionsListResponseDto,
  })
  async getPassengerTransactions(@Query() query: GetPassengerTransactionsDto) {
    return this.passengerTransactionsService.getPassengerTransactions(query);
  }

  @Get('export')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export passenger transactions to CSV or Excel' })
  @ApiQuery({ name: 'format', required: true, enum: ExportFormat, description: 'Export format: csv or excel' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Export file generated successfully' })
  async exportPassengerTransactions(
    @Res() res: Response,
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    if (!format || (format !== ExportFormat.CSV && format !== ExportFormat.EXCEL)) {
      throw new BadRequestException('Invalid format. Must be "csv" or "excel"');
    }

    const exportResult = await this.passengerTransactionsService.exportPassengerTransactions(
      format as ExportFormat,
      startDate,
      endDate,
      status,
      paymentMethod,
    );

    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.buffer);
  }
}
