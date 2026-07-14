import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import basicAuth from "express-basic-auth";

async function bootstrap() {
  const PORT = process.env.PORT || 3000;
  const app = await NestFactory.create(AppModule);

  // Добавляем Basic Auth для Swagger
  app.use(
    ["/api/docs", "/api/docs-json"],
    basicAuth({
      users: { admin: "Abc!1234" },
      challenge: true,
    }),
  );

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle("Heizreport SHK_info")
    .setDescription("Docs REST API")
    .setVersion("1.0.0")
    .addTag("ALEX K")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/api/docs", app, document);

  //app.use(cookieParser()); // ✅ Подключаем обработку кук
  //app.enableCors();
  app.enableCors({
    origin: (origin: any, callback: any) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        "https://chsm.shk.solutions",
        "https://serv.chsm.pro",
        "https://fuenex.de",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:3001",
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not allowed by CORS`));
      }
    },
    credentials: true,
  });

  await app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

bootstrap();
