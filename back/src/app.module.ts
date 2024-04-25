import {Module, ValidationPipe} from "@nestjs/common";
import {AppController} from "./app.controller";
import {AppService} from "./app.service";
import {AuthModule} from "./auth/auth.module";
import {UsersModule} from "./users/users.module";
import {MongooseModule} from "@nestjs/mongoose";
import {TokensModule} from "./tokens/tokens.module";
import {ConfigModule} from "@nestjs/config";
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
import {APP_GUARD, APP_PIPE} from "@nestjs/core";
import {redisStore} from "cache-manager-redis-yet";
import {SerieprogressModule} from "./serieprogress/serieprogress.module";
import {UserwordsModule} from "./userwords/userwords.module";
import {InvisModule} from "./invis/invis.module";

@Module({
    imports: [
        ConfigModule.forRoot({isGlobal: true, envFilePath: ".env"}),
        CacheModule.register({
            isGlobal: true,
            store: redisStore,
            url:"redis://" + process.env.REDIS_HOST + ":6379"}
        ),
        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST || "cache",
                port: 6379
            }
        }),
        BullModule.registerQueue(
            {
                name: "rescan-library"
            }
        ),
        AuthModule,
        UsersModule,
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGOURL || "mongodb://mongodb:27017/yomiyasu"),
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
        ReviewsModule,
        SerieprogressModule,
        UserwordsModule,
        InvisModule
    ],

    controllers: [AppController],
    providers: [AppService, ScanWorker,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard
        },
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist:true,
                transform: true
            })
        }
    ]
})
export class AppModule {}
