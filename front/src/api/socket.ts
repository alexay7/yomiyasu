import {io} from "socket.io-client";

const socket = io("/api/events", {path:"/api/events/socket.io", transports:["polling"]});

export default socket;