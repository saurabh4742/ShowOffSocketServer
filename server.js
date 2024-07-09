const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(cors());
const server = http.createServer(app);
const { PrismaClient } = require("@prisma/client");
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const prisma = new PrismaClient();

let onlineUsers = [];

io.on("connection", (socket) => {
  socket.on("set_user_id", async (userId) => {
    socket.userId = userId;
    console.log(`User I Chat With: ${socket.userId}`);
    const UserItalk = await prisma.user.findUnique({
      where: {
        id: socket.userId,
      },
    });
    socket.emit("user-detail", {
      username: UserItalk.FirstName  + " " + UserItalk.LastName,
      imageUrl: UserItalk.imageUrl,
    });
  });
  socket.on("check_online_status", () => {
    const isOnline = onlineUsers.includes(socket.userId);
    socket.emit("online_status", isOnline);
  });
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId; // Store the room ID on the socket
    console.log(`User Id chat with ${socket.userId} joined room ${roomId}`);
  });
  socket.on("clerkuserId", async (ClerkuserId) => {
    const me = await prisma.user.findUnique({
      where: {
        clerkUserId: ClerkuserId,
      },
    });
    socket.myuserid = me.id;
    if (!onlineUsers.includes(socket.myuserid)) {
      onlineUsers.push(socket.myuserid);
    }
    console.log(`MyuserId ${socket.myuserid}`);
    console.log("Online users:", onlineUsers);
    const messagesFromMeToOther = await prisma.chat.findMany({
      where: {
        sender: socket.myuserid,
        receiver: socket.userId
      },
      orderBy:{sentAt:"asc"}
    });
    
    // Fetch messages from socket.userId to socket.myuserid
    const messagesFromOtherToMe = await prisma.chat.findMany({
      where: {
        sender: socket.userId,
        receiver: socket.myuserid
      },
      orderBy:{sentAt:"asc"}
    });
    
    // Combine both sets of messages and sort by sentAt
    const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    socket.emit("All_chat_Solo",allMessages)
  });
  socket.on("send_msg", async (IMsgData) => {
    console.log(IMsgData, "DATA");
    const message=await prisma.chat.create({
      data: {
        sender: socket.myuserid,
        receiver: socket.userId,
        message: IMsgData,
      },
    });
    
    socket.emit("receive_msg",message)
  });
  
  socket.on("disconnect", async () => {
    console.log(`disconnected: ${socket.myuserid}`);
    onlineUsers = onlineUsers.filter((id) => id !== socket.myuserid);
  });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
