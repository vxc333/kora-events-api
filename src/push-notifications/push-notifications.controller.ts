import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PushNotificationsService } from './push-notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { PushToken } from './push-token.entity';

@ApiTags('Push Notifications')
@Controller('push-tokens')
export class PushNotificationsController {
  constructor(private readonly pushService: PushNotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a device FCM token' })
  register(@Body() dto: RegisterTokenDto): Promise<PushToken> {
    return this.pushService.registerToken(dto);
  }
}
