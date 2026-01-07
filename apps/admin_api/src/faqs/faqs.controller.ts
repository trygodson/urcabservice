import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CurrentUser, JwtAdminAuthGuard, Role, SetRolesMetaData } from '@urcab-workspace/shared';
import { FaqsService } from './faqs.service';
import { CreateFaqDto, UpdateFaqDto, QueryFaqDto, FaqResponseDto } from './dto';

@ApiTags('Admin - FAQs')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Post()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiResponse({ status: 201, description: 'FAQ created successfully', type: FaqResponseDto })
  async create(@Body() createFaqDto: CreateFaqDto, @CurrentUser() user: any) {
    return this.faqsService.create(createFaqDto, user.sub);
  }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all FAQs with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'FAQs retrieved successfully' })
  async findAll(@Query() query: QueryFaqDto) {
    return this.faqsService.findAll(query);
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a FAQ by ID' })
  @ApiParam({ name: 'id', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ retrieved successfully', type: FaqResponseDto })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async findOne(@Param('id') id: string) {
    return this.faqsService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a FAQ' })
  @ApiParam({ name: 'id', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully', type: FaqResponseDto })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto, @CurrentUser() user: any) {
    return this.faqsService.update(id, updateFaqDto, user.sub);
  }

  @Delete(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a FAQ' })
  @ApiParam({ name: 'id', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async remove(@Param('id') id: string) {
    await this.faqsService.remove(id);
    return { message: 'FAQ deleted successfully' };
  }
}

