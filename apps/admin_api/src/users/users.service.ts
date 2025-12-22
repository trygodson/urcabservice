import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { UserRepository, RoleRepository, Role, PermissionRepository } from '@urcab-workspace/shared';
import { CreateAdminUserDto, UpdateAdminUserDto, UserPermissionsResponseDto, PermissionDto } from './dto';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async createAdminUser(createUserDto: CreateAdminUserDto, createdBy: string) {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException(`User with email "${createUserDto.email}" already exists`);
    }

    // Validate role exists
    const role = await this.roleRepository.findById(createUserDto.roleId);
    if (!role || !role.isActive) {
      throw new BadRequestException(`Role with ID ${createUserDto.roleId} not found or inactive`);
    }

    // Hash password
    const passSalt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(createUserDto.password, passSalt);

    // Create user
    const user = await this.userRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      passwordHash,
      passwordSalt: passSalt,
      type: Role.ADMIN, // Keep type for backward compatibility
      roleId: new Types.ObjectId(createUserDto.roleId),
      isEmailConfirmed: true, // Admin users are pre-verified
      isActive: createUserDto.isActive ?? true,
    });

    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId?.toString(),
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findAll() {
    const users = await this.userRepository.find({ type: Role.ADMIN }, ['roleId']);
    return users.map((user) => ({
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId?._id.toString(),
      role: user.roleId ? (user.roleId as any).name : null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ _id: new Types.ObjectId(id), type: Role.ADMIN }, ['roleId']);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId?.toString(),
      role: user.roleId ? (user.roleId as any) : null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateUserById(id: string, updateUserDto: UpdateAdminUserDto, updatedBy: string) {
    const user = await this.userRepository.findOne({ _id: new Types.ObjectId(id), type: Role.ADMIN });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and if it already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({ email: updateUserDto.email });
      if (existingUser) {
        throw new ConflictException(`User with email "${updateUserDto.email}" already exists`);
      }
    }

    // Validate role if being updated
    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findById(updateUserDto.roleId);
      if (!role || !role.isActive) {
        throw new BadRequestException(`Role with ID ${updateUserDto.roleId} not found or inactive`);
      }
    }

    const updateData: any = {};

    if (updateUserDto.fullName) {
      updateData.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      const passSalt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(updateUserDto.password, passSalt);
      updateData.passwordHash = passwordHash;
      updateData.passwordSalt = passSalt;
    }

    if (updateUserDto.roleId) {
      updateData.roleId = new Types.ObjectId(updateUserDto.roleId);
    }

    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.userRepository.findOneAndUpdate({ _id: new Types.ObjectId(id) }, updateData);

    return {
      _id: updatedUser._id.toString(),
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      roleId: updatedUser.roleId?.toString(),
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteUserById(id: string) {
    const user = await this.userRepository.findOne({ _id: new Types.ObjectId(id), type: Role.ADMIN });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if user is Super Admin
    if (user.type === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete Super Admin user');
    }

    // Soft delete by setting isActive to false
    await this.userRepository.findOneAndUpdate({ _id: new Types.ObjectId(id) }, { isActive: false });

    return { message: 'User deleted successfully' };
  }

  async viewUserPermissionsById(id: string): Promise<UserPermissionsResponseDto> {
    const user = await this.userRepository.findOne(
      { _id: new Types.ObjectId(id), type: { $in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      ['roleId'],
    );

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isSuperAdmin = user.type === Role.SUPER_ADMIN;
    let permissions: PermissionDto[] = [];
    let roleName: string | null = null;

    if (isSuperAdmin) {
      // Super Admin has all permissions
      const allPermissions = await this.permissionRepository.find({ isActive: true });
      permissions = allPermissions.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
      }));
      roleName = 'Super Admin';
    } else if (user.roleId) {
      // Get role with permissions
      const role = await this.roleRepository.findByIdWithPermissions(user.roleId._id.toString());
      if (role && role.permissions) {
        roleName = role.name;
        // Extract permission IDs
        const permissionIds = role.permissions.map((p: any) => {
          if (typeof p === 'object' && p._id) {
            return p._id.toString();
          }
          return p.toString();
        });

        // Fetch full permission details
        if (permissionIds.length > 0) {
          const permissionDocs = await this.permissionRepository.findByIds(permissionIds);
          permissions = permissionDocs.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            description: p.description,
            category: p.category,
          }));
        }
      }
    }

    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId?._id.toString() || null,
      roleName,
      isSuperAdmin,
      permissions,
    };
  }
}
