import {Module} from "@nestjs/common";
import {AppController} from "./app.controller";
import {AppService} from "./app.service";
import {AuthModule} from "./auth/auth.module";
import {UsersModule} from "./users/users.module";
import {MongooseModule} from "@nestjs/mongoose";
import {TokensModule} from "./tokens/tokens.module";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {BooksModule} from "./books/books.module";
import {SeriesModule} from "./series/series.module";
import {ScheduleModule} from "@nestjs/schedule";
import {ReadprogressModule} from "./readprogress/readprogress.module";
import {ReadlistModule} from "./readlist/readlist.module";
import {WebsocketsModule} from "./websockets/websockets.module";
import {CacheModule} from "@nestjs/cache-manager";
import {DictionaryModule} from "./dictionary/dictionary.module";
import {ReviewsModule} from "./reviews/reviews.module";
import {BullModule} from "@nestjs/bull";
import {ScanWorker} from "./queue/scan-library.job";
import {ThrottlerModule, ThrottlerGuard} from "@nestjs/throttler";
import {APP_GUARD} from "@nestjs/core";

@Module({
    imports: [
        ConfigModule.forRoot({isGlobal: true, envFilePath: ".env"}),
        CacheModule.register({isGlobal:true}),
        BullModule.forRoot({
            redis: {
                host: "cache",
                port: 6379
            }
        }),
        BullModule.registerQueueAsync(
            {
                name: "rescanLibrary"
            }
        ),
        AuthModule,
        UsersModule,
        ScheduleModule.forRoot(),
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>("MONGOURL") || "mongodb://mongodb:27017/yomiyasu"
            }),
            inject: [ConfigService]
        }),
        ThrottlerModule.forRoot({
            ttl: 10,
            limit: 100
        }),
        TokensModule,
        BooksModule,
        SeriesModule,
        ReadprogressModule,
        ReadlistModule,
        WebsocketsModule,
        DictionaryModule,
        ReviewsModule
    ],

    controllers: [AppController],
    providers: [AppService, ScanWorker,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard
        }
    ]
})
export class AppModule {}
