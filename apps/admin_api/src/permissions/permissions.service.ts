import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PermissionRepository } from '@urcab-workspace/shared';
import { PermissionResponseDto } from './dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly permissionRepository: PermissionRepository) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find({ isActive: true });
    return permissions.map((permission) => this.mapToResponseDto(permission));
  }

  async findByCategory(category: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.findByCategory(category);
    return permissions.map((permission) => this.mapToResponseDto(permission));
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission || !permission.isActive) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return this.mapToResponseDto(permission);
  }

  async getCategories(): Promise<string[]> {
    const permissions = await this.permissionRepository.find({ isActive: true });
    const categories = [...new Set(permissions.map((p) => p.category))];
    return categories.sort();
  }

  private mapToResponseDto(permission: any): PermissionResponseDto {
    return {
      _id: permission._id.toString(),
      name: permission.name,
      description: permission.description,
      category: permission.category,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}

