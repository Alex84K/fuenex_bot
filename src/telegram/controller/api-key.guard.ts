import {
    Injectable,
    UnauthorizedException,
    type CanActivate,
    type ExecutionContext,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  
  @Injectable()
  export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) {}
  
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      // Получаем ключ из заголовка x-api-key
      const apiKey = request.headers['x-api-key'];
      
      // Получаем правильный ключ из .env
      const systemKey = this.configService.get<string>('KEY_FOR_CONTROLLERS');
  
      if (!apiKey || apiKey !== systemKey) {
        throw new UnauthorizedException('Invalid or missing API Key');
      }
  
      return true;
    }
  }