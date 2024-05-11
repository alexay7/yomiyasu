import {WebSocketGateway, WebSocketServer} from "@nestjs/websockets";
import {Server} from "socket.io";

@WebSocketGateway(3002, {namespace:"ws"})
export class WebsocketsGateway {
  @WebSocketServer()
  server: Server;

  afterInit() { 
      console.log("WebSocket server initialized.");
  }

  sendNotificationToClient(notification: unknown) {
      this.server.emit("notification", notification);
  }
}
