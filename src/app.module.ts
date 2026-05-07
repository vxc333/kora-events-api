import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { ParticipantsModule } from './participants/participants.module';
import { CheckinModule } from './checkin/checkin.module';
import { CertificatesModule } from './certificates/certificates.module';
import { TicketsModule } from './tickets/tickets.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { EventPartnersModule } from './event-partners/event-partners.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReportsModule } from './reports/reports.module';
import { CertificateSignersModule } from './certificate-signers/certificate-signers.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { RegistrationFieldsModule } from './registration-fields/registration-fields.module';
import { BroadcastsModule } from './broadcasts/broadcasts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') === 'development',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    MailModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ParticipantsModule,
    CheckinModule,
    CertificatesModule,
    TicketsModule,
    PaymentsModule,
    EventPartnersModule,
    CouponsModule,
    ReportsModule,
    CertificateSignersModule,
    WaitlistModule,
    RegistrationFieldsModule,
    BroadcastsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
