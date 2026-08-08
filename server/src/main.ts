import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // In dev, we test through a cloudflared tunnel (Telegram Mini App requires
  // HTTPS) in addition to the regular localhost dashboard — so CORS needs to
  // allow both origins, not just localhost. CLIENT_URL is read at boot, so a
  // tunnel domain change (cloudflared rotates on restart) requires a server
  // restart to take effect here, same as any other .env change.
  const devOrigins = ["http://localhost:3000", process.env.CLIENT_URL].filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : devOrigins,
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
}
bootstrap();
