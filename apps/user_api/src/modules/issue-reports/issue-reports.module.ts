import { Module } from '@nestjs/common';
import { IssueReportsController } from './issue-reports.controller';
import { IssueReportsService } from './issue-reports.service';
import {
  DatabaseModule,
  IssueReport,
  IssueReportRepository,
  IssueReportSchema,
  Ride,
  RideRepository,
  RideSchema,
  User,
  UserRepository,
  UserSchema,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: IssueReport.name, schema: IssueReportSchema },
      { name: Ride.name, schema: RideSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [IssueReportsController],
  providers: [IssueReportsService, IssueReportRepository, RideRepository, UserRepository],
  exports: [IssueReportsService],
})
export class IssueReportsModule {}
