import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { ConditionalModule, ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Подключаем TelegramModule только если TG_MODULE равен 'true'
    ConditionalModule.registerWhen(
      TelegramModule,
      (env: NodeJS.ProcessEnv) => env.TG_MODULE === 'true',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
