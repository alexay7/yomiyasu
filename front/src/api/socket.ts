import {io} from "socket.io-client";

const socket = io("/ws", {transports:["websocket"]});

export default socket;