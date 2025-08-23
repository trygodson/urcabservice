import { Module } from '@nestjs/common';
import { VehicleController } from './driverVehicle.controller';
import { VehicleDocumentController } from './driverVehicleDocument.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseModule,
  User,
  UserSchema,
  Vehicle,
  VehicleDocumentRecord,
  VehicleDocumentSchema,
  VehicleSchema,
} from '@urcab-workspace/shared';
import { VehicleRepository } from './repository/vehicle.repository';
import { VehicleDocumentRepository } from './repository/vehicleDocument.repository';
import { VehicleService } from './driverVehicle.service';
import { VehicleDocumentService } from './driverVehicleDocument.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_DSECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`,
          },
        };
      },
      inject: [ConfigService],
    }),

    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleDocumentRecord.name, schema: VehicleDocumentSchema },
    ]),
  ],
  providers: [VehicleRepository, VehicleDocumentRepository, VehicleService, VehicleDocumentService],
  controllers: [VehicleController, VehicleDocumentController],
})
export class DriverVehicleModule {}
