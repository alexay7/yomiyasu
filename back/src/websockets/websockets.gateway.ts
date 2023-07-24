import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server,Socket } from 'socket.io';

@WebSocketGateway({path:"/api/events/socket.io",namespace:"/api/events"})
export class WebsocketsGateway {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket server initialized.');
  }

  sendNotificationToClient(notification: any) {
    this.server.emit('notification', notification);
  }
}
