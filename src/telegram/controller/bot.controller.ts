import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { BotService } from "../bot/bot.service";
import { ApiKeyGuard } from "./api-key.guard";
import type { SendMessageDto } from "../dto/send_message.dto";

@Controller("api/telegram")
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post("send")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async sendToSupport(@Body() dto: SendMessageDto): Promise<{ success: true }> {
    await this.botService.sendToSupport(dto.name, dto.email, dto.message);
    return { success: true };
  }
}
