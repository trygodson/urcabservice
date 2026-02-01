import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAdminAuthGuard, Role, SetRolesMetaData, CurrentUser, User } from '@urcab-workspace/shared';
import { WithdrawalsService } from './withdrawals.service';
import { ApproveWithdrawalDto, RejectWithdrawalDto } from './dto';

@ApiTags('Admin - Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all withdrawal requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
  })
  async getWithdrawalRequests(@Query() query: any) {
    return await this.withdrawalsService.getWithdrawalRequests(query);
  }

  @Patch(':requestId/approve')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Approve withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal request approved successfully' })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async approveWithdrawalRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() admin: User,
    @Body() approveDto: ApproveWithdrawalDto,
  ) {
    return await this.withdrawalsService.approveWithdrawalRequest(requestId, admin._id.toString(), approveDto);
  }

  @Patch(':requestId/reject')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Reject withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal request rejected successfully' })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async rejectWithdrawalRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() admin: User,
    @Body() rejectDto: RejectWithdrawalDto,
  ) {
    return await this.withdrawalsService.rejectWithdrawalRequest(requestId, admin._id.toString(), rejectDto);
  }
}
