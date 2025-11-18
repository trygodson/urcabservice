import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, LoggerModule, VehicleType, VehicleTypeSchema } from '@urcab-workspace/shared';
import { VehicleTypesController } from './vehicleTypes.controller';
import { VehicleTypesService } from './vehicleTypes.service';
import { AdminVehicleTypeRepository } from './repository';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: VehicleType.name, schema: VehicleTypeSchema }]),
    LoggerModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_SECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [VehicleTypesController],
  providers: [VehicleTypesService, AdminVehicleTypeRepository],
})
export class VehicleTypesModule {}
