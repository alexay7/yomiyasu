import {WebSocketGateway, WebSocketServer} from "@nestjs/websockets";
import {Server} from "socket.io";

@WebSocketGateway({path:"/api/events/socket.io", namespace:"/api/events"})
export class WebsocketsGateway {
  @WebSocketServer()
  server: Server;

  afterInit() {
      console.log("WebSocket server initialized.");
  }

  sendNotificationToClient(notification: any) {
      this.server.emit("notification", notification);
  }
}
