import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Bot } from "grammy";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly supportChatId: number;

  constructor(
    @Inject("TELEGRAM_BOT") private readonly bot: Bot,
    private readonly configService: ConfigService,
  ) {
    const chatId = this.configService.get<string>("TELEGRAM_CHAT_ID");
    if (!chatId) {
      throw new Error("TELEGRAM_CHAT_ID not found in .env");
    }
    this.supportChatId = Number(chatId);
    if (Number.isNaN(this.supportChatId)) {
      throw new Error("TELEGRAM_CHAT_ID must be a number");
    }
  }

  /**
   * Отправляет сообщение от пользователя в чат техподдержки.
   */
  async sendToSupport(
    name: string,
    email: string,
    message: string,
  ): Promise<void> {
    const text = [
      `📩 *Новое сообщение с сайта*`,
      ``,
      `👤 *Имя:* ${this.escapeMarkdown(name)}`,
      `📧 *Email:* ${this.escapeMarkdown(email)}`,
      `💬 *Сообщение:*`,
      `${this.escapeMarkdown(message)}`,
    ].join("\n");

    try {
      await this.bot.api.sendMessage(this.supportChatId, text, {
        parse_mode: "MarkdownV2",
      });
      this.logger.log(`Сообщение отправлено в чат ${this.supportChatId}`);
    } catch (error) {
      this.logger.error(`Ошибка отправки в Telegram: ${error}`);
      throw error;
    }
  }

  private escapeMarkdown(text: string): string {
    // Экранирование спецсимволов для MarkdownV2
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }
}
