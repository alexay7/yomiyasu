import {io} from "socket.io-client";

const socket = io("/ws", {
    transports:["websocket"],
    reconnection:true,
    reconnectionAttempts:Infinity,
    reconnectionDelay:2000,
    reconnectionDelayMax:30000
});

export default socket;
