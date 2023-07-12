import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TokensModule } from './tokens/tokens.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BooksModule } from './books/books.module';
import { SeriesModule } from './series/series.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReadprogressModule } from './readprogress/readprogress.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AuthModule,
    UsersModule,
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGOURL'),
      }),
      inject: [ConfigService],
    }),
    TokensModule,
    BooksModule,
    SeriesModule,
    ReadprogressModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
