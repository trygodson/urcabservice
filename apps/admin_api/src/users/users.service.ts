import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { UserRepository, RoleRepository, Role } from '@urcab-workspace/shared';
import { CreateAdminUserDto } from './dto';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly userRepository: UserRepository, private readonly roleRepository: RoleRepository) {}

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
      roleId: user.roleId?.toString(),
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
}
