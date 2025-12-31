import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAdminAuthGuard, Role, SetRolesMetaData } from '@urcab-workspace/shared';
import { DashboardService } from './dashboard.service';
import { GetDashboardStatisticsDto, DashboardResponseDto } from './dto';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  @ApiQuery({
    name: 'ridePeriod',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time period for passenger ride statistics',
  })
  @ApiQuery({
    name: 'evpPeriod',
    required: false,
    enum: ['week', 'month'],
    description: 'Time period for approved EVP statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardResponseDto,
  })
  async getDashboardStatistics(@Query() query: GetDashboardStatisticsDto): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboardStatistics(query);
  }
}

