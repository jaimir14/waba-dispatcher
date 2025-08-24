import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`🚀 ${configService.appName} running on port ${port}`);
}
bootstrap();
