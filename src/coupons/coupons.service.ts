import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, DiscountType } from './coupon.entity';
import { EventsService } from '../events/events.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly eventsService: EventsService,
  ) {}

  private validateDiscountValue(discountType: DiscountType, discountValue: number): void {
    if (discountType === DiscountType.PERCENTAGE && (discountValue < 1 || discountValue > 100)) {
      throw new BadRequestException('Desconto percentual deve estar entre 1 e 100');
    }
    if (discountType === DiscountType.FIXED && discountValue < 0) {
      throw new BadRequestException('Desconto fixo não pode ser negativo');
    }
  }

  async create(eventId: string, organizerId: string, dto: CreateCouponDto): Promise<Coupon> {
    await this.eventsService.findOne(eventId, organizerId);
    this.validateDiscountValue(dto.discountType, dto.discountValue);

    const coupon = this.couponRepo.create({
      ...dto,
      eventId,
      code: dto.code.toUpperCase(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return this.couponRepo.save(coupon);
  }

  async validate(eventId: string, code: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({
      where: { eventId, code: code.toUpperCase() },
    });

    if (!coupon) throw new NotFoundException('Cupom não encontrado');

    if (!coupon.isActive) {
      throw new HttpException(
        { message: 'Cupom inativo', code: 'COUPON_INACTIVE' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new HttpException(
        { message: 'Cupom expirado', code: 'COUPON_EXPIRED' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new HttpException(
        { message: 'Cupom atingiu o limite de usos', code: 'COUPON_LIMIT_REACHED' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return coupon;
  }

  async findByEvent(eventId: string, organizerId: string): Promise<Coupon[]> {
    await this.eventsService.findOne(eventId, organizerId);
    return this.couponRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findCoupon(eventId: string, couponId: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id: couponId, eventId } });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }

  async update(eventId: string, couponId: string, organizerId: string, dto: UpdateCouponDto): Promise<Coupon> {
    await this.eventsService.findOne(eventId, organizerId);
    const coupon = await this.findCoupon(eventId, couponId);

    if (dto.discountValue !== undefined) {
      this.validateDiscountValue(coupon.discountType, dto.discountValue);
    }

    Object.assign(coupon, {
      ...dto,
      ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
    });

    return this.couponRepo.save(coupon);
  }

  async deactivate(eventId: string, couponId: string, organizerId: string): Promise<Coupon> {
    await this.eventsService.findOne(eventId, organizerId);
    const coupon = await this.findCoupon(eventId, couponId);
    coupon.isActive = false;
    return this.couponRepo.save(coupon);
  }
}
