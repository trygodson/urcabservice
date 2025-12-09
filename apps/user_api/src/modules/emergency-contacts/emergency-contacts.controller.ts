import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, SetRolesMetaData, User } from '@urcab-workspace/shared';
import { CreateEmergencyContactDto, EmergencyContactResponseDto } from './dto';
import { EmergencyContactsService } from './emergency-contacts.service';

@ApiTags('Emergency Contacts')
@Controller('emergency-contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EmergencyContactsController {
  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  @Post()
  @SetRolesMetaData(Role.PASSENGER)
  @ApiOperation({ summary: 'Add a new emergency contact (max 3 per user)' })
  @ApiResponse({ status: 201, type: EmergencyContactResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateEmergencyContactDto) {
    return this.emergencyContactsService.create(user._id.toString(), dto);
  }

  @Get()
  @SetRolesMetaData(Role.PASSENGER)
  @ApiOperation({ summary: 'List emergency contacts for the current user' })
  @ApiResponse({ status: 200, type: [EmergencyContactResponseDto] })
  async list(@CurrentUser() user: User) {
    return this.emergencyContactsService.list(user._id.toString());
  }

  @Delete(':id')
  @SetRolesMetaData(Role.PASSENGER)
  @ApiOperation({ summary: 'Delete an emergency contact by id' })
  @ApiResponse({ status: 200, description: 'Contact removed' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.emergencyContactsService.remove(user._id.toString(), id);
  }
}
