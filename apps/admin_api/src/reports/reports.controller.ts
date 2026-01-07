import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAdminAuthGuard, SetRolesMetaData, Role } from '@urcab-workspace/shared';
import { ReportsService } from './reports.service';
import { GetReportsDto, ReportsResponseDto, TimePeriod } from './dto';

@ApiTags('Reports & Analytics')
@Controller('admin/reports')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get reports and analytics data' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description: 'Time period for reports (day, week, or month)',
    example: TimePeriod.DAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: ReportsResponseDto,
  })
  async getReports(@Query() query: GetReportsDto): Promise<ReportsResponseDto> {
    return await this.reportsService.getReports(query);
  }
}

