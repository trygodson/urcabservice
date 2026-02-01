import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, SetRolesMetaData, User } from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { WalletService } from './wallet.service';
import {
  CreateDepositDto,
  WalletBalanceResponseDto,
  TransactionResponseDto,
  QueryTransactionsDto,
  TransactionsListResponseDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateWithdrawalRequestDto,
} from './dto';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Get wallet balance (sum of credits minus debits with WITHDRAWABLE balance type)' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: WalletBalanceResponseDto,
  })
  async getWalletBalance(@CurrentUser() user: User): Promise<WalletBalanceResponseDto> {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.getWalletBalance(userId);
  }

  @Get('transactions')
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Get paginated wallet transactions' })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by transaction category',
    required: false,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'RIDE', 'EVP_PAYMENT', 'SUBSCRIPTION'],
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by transaction status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'PENDING_REVIEW', 'REVERSED'],
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by transaction type (1=DEBIT, 2=CREDIT)',
    required: false,
    type: Number,
    example: 2,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet transactions retrieved successfully',
    type: TransactionsListResponseDto,
  })
  async getWalletTransactions(
    @CurrentUser() user: User,
    @Query() queryDto: QueryTransactionsDto,
  ): Promise<TransactionsListResponseDto> {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.getWalletTransactions(userId, queryDto);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER)
  @ApiOperation({ summary: 'Create a deposit transaction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deposit transaction created successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid deposit data',
  })
  async createDeposit(
    @CurrentUser() user: User,
    @Body() createDepositDto: CreateDepositDto,
  ): Promise<TransactionResponseDto> {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.createDepositTransaction(userId, createDepositDto);
  }

  // Bank Account endpoints
  @Post('bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Create a bank account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bank account created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bank account data',
  })
  async createBankAccount(@CurrentUser() user: User, @Body() createDto: CreateBankAccountDto) {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.createBankAccount(userId, createDto);
  }

  @Get('bank-accounts')
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Get all bank accounts for user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank accounts retrieved successfully',
  })
  async getBankAccounts(@CurrentUser() user: User) {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.getBankAccounts(userId);
  }

  @Put('bank-accounts/:accountId')
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank account updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank account not found',
  })
  async updateBankAccount(
    @CurrentUser() user: User,
    @Param('accountId') accountId: string,
    @Body() updateDto: UpdateBankAccountDto,
  ) {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.updateBankAccount(userId, accountId, updateDto);
  }

  @Delete('bank-accounts/:accountId')
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank account deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank account not found',
  })
  async deleteBankAccount(@CurrentUser() user: User, @Param('accountId') accountId: string) {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.deleteBankAccount(userId, accountId);
  }

  // Withdrawal request endpoint
  @Post('withdrawal-request')
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER, Role.DRIVER)
  @ApiOperation({ summary: 'Create a withdrawal request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Withdrawal request created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid withdrawal data or insufficient balance',
  })
  async createWithdrawalRequest(@CurrentUser() user: User, @Body() createWithdrawalDto: CreateWithdrawalRequestDto) {
    const userId = new Types.ObjectId(user._id);
    return await this.walletService.createWithdrawalRequest(userId, createWithdrawalDto);
  }
}
