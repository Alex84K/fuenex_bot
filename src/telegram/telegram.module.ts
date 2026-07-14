import { Module, Global } from "@nestjs/common";
import { Bot } from "grammy";
import { BotService } from "./bot/bot.service.ts";
import { BotController } from "./controller/bot.controller.ts";

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: "TELEGRAM_BOT",
      useFactory: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error("TELEGRAM_BOT_TOKEN not found in .env");
        return new Bot(token);
      },
    },
    BotService,
  ],
  exports: ["TELEGRAM_BOT", BotService],
  controllers: [BotController],
})
export class TelegramModule {}
