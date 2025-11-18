import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { IssueReport, IssueReportDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminPassengerReportRepository extends AbstractRepository<IssueReportDocument> {
  constructor(@InjectModel(IssueReport.name) reportModel: Model<IssueReportDocument>) {
    super(reportModel);
  }
}
