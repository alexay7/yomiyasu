import {io} from "socket.io-client";

const socket = io("/ws");

export default socket;