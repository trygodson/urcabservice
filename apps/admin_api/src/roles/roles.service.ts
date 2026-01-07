import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { RoleRepository, PermissionRepository, UserRepository } from '@urcab-workspace/shared';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto, QueryRolesDto } from './dto';
import { Types } from 'mongoose';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(createRoleDto: CreateRoleDto, createdBy: string): Promise<RoleResponseDto> {
    // Check if role name already exists
    const existingRole = await this.roleRepository.findByName(createRoleDto.name);
    if (existingRole) {
      throw new ConflictException(`Role with name "${createRoleDto.name}" already exists`);
    }

    // Validate permissions exist
    if (createRoleDto.permissions.length > 0) {
      const permissions = await this.permissionRepository.findByIds(createRoleDto.permissions);
      if (permissions.length !== createRoleDto.permissions.length) {
        throw new BadRequestException('One or more permissions are invalid');
      }
    }

    const role = await this.roleRepository.model.create({
      _id: new Types.ObjectId(),
      ...createRoleDto,
      permissions: createRoleDto.permissions.map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(createdBy),
      isSystemRole: false,
      isActive: createRoleDto.isActive ?? true,
    });

    return this.findById(role._id.toString());
  }

  async findAll(query?: QueryRolesDto): Promise<RoleResponseDto[]> {
    // Build filter based on query parameter
    const filter: any = {};
    if (query?.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    // If no filter is provided, get all roles (active and inactive)
    const roles = await this.roleRepository.find(filter);
    return Promise.all(roles.map((role) => this.mapToResponseDto(role)));
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    return this.findById(id);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, updatedBy: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Check name uniqueness if name is being updated
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findByName(updateRoleDto.name);
      if (existingRole) {
        throw new ConflictException(`Role with name "${updateRoleDto.name}" already exists`);
      }
    }

    // Validate permissions if provided
    if (updateRoleDto.permissions && updateRoleDto.permissions.length > 0) {
      const permissions = await this.permissionRepository.findByIds(updateRoleDto.permissions);
      if (permissions.length !== updateRoleDto.permissions.length) {
        throw new BadRequestException('One or more permissions are invalid');
      }
    }

    const updateData: any = {
      ...updateRoleDto,
      updatedBy: new Types.ObjectId(updatedBy),
    };

    if (updateRoleDto.permissions) {
      updateData.permissions = updateRoleDto.permissions.map((id) => new Types.ObjectId(id));
    }

    await this.roleRepository.findOneAndUpdate({ _id: id }, updateData);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if any users are using this role
    const usersWithRole = await this.userRepository.count({ roleId: new Types.ObjectId(id) });
    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role. ${usersWithRole} user(s) are currently assigned this role`);
    }

    // Soft delete by setting isActive to false
    await this.roleRepository.findOneAndUpdate({ _id: id }, { isActive: false });
  }

  private async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findByIdWithPermissions(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return this.mapToResponseDto(role);
  }

  private async mapToResponseDto(role: any): Promise<RoleResponseDto> {
    return {
      _id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: (role.permissions || []).map((p: any) => ({
        _id: p._id?.toString() || p.toString(),
        name: p.name || '',
        description: p.description || '',
        category: p.category || '',
      })),
      isActive: role.isActive,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
