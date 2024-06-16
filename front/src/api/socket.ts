import {io} from "socket.io-client";

const socket = io("/ws", {transports:["websocket"],retries:1,reconnection:false,reconnectionAttempts:1});

export default socket;