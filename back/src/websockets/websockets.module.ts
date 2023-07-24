import {Module, Global} from "@nestjs/common";
import {WebsocketsGateway} from "./websockets.gateway";

@Global()
@Module({
    providers: [WebsocketsGateway],
    exports:[WebsocketsGateway]
})
export class WebsocketsModule {}
