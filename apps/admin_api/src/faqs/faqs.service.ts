import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminFaqRepository } from './repository/adminFaq.repository';
import { CreateFaqDto, UpdateFaqDto, QueryFaqDto, FaqResponseDto } from './dto';

@Injectable()
export class FaqsService {
  private readonly logger = new Logger(FaqsService.name);

  constructor(private readonly faqRepository: AdminFaqRepository) {}

  async create(createFaqDto: CreateFaqDto, adminId: string): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.create({
      _id: new Types.ObjectId(),
      ...createFaqDto,
      category: createFaqDto.category || 'Driver',
      order: createFaqDto.order ?? 0,
      isActive: createFaqDto.isActive !== undefined ? createFaqDto.isActive : true,
      viewCount: 0,
      createdBy: new Types.ObjectId(adminId),
    });

    return this.mapToResponseDto(faq);
  }

  async findAll(query: QueryFaqDto) {
    const { page = 1, limit = 10, search, category, isActive } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [{ question: { $regex: search, $options: 'i' } }, { answer: { $regex: search, $options: 'i' } }];
    }

    if (category) {
      filter.category = category;
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    // Get FAQs with pagination
    const faqs = await this.faqRepository.findWithPagination(filter, skip, limit, {
      sort: { order: 1, createdAt: -1 },
    });

    const total = await this.faqRepository.countDocuments(filter);

    return {
      faqs: faqs.map((faq) => this.mapToResponseDto(faq)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return this.mapToResponseDto(faq);
  }

  async update(id: string, updateFaqDto: UpdateFaqDto, adminId: string): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    const updatedFaq = await this.faqRepository.findByIdAndUpdate(id, {
      ...updateFaqDto,
      updatedBy: new Types.ObjectId(adminId),
    });

    return this.mapToResponseDto(updatedFaq);
  }

  async remove(id: string): Promise<void> {
    const faq = await this.faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    await this.faqRepository.deleteOne({ _id: new Types.ObjectId(id) });
  }

  private mapToResponseDto(faq: any): FaqResponseDto {
    return {
      _id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      isActive: faq.isActive,
      viewCount: faq.viewCount,
      createdBy: faq.createdBy,
      updatedBy: faq.updatedBy,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    };
  }
}
