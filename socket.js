const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
dotenv.config();

let httpServer = createServer();
const { PrismaClient } = require("@prisma/client");
const io = new Server(httpServer, {
  cors: {
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
const prisma = new PrismaClient();


// let onlineUsers = new Set();
io.on("connection", (socket) => {
    console.log(`user connected ${socket.id}`)
    socket.on("set_user_id", async (userId) => {
      socket.userId = userId;
      console.log(`User I Chat With: ${socket.userId}`);
      const UserItalk = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { FirstName: true, LastName: true, imageUrl: true },
      });
      socket.emit("user-detail", {
        username: `${UserItalk.FirstName} ${UserItalk.LastName}`,
        imageUrl: UserItalk.imageUrl,
      });
    });
  
    socket.on("check_online_status", () => {
      // const isOnline = onlineUsers.has(socket.userId);
      // socket.emit("online_status", isOnline);
    });
  
    socket.on("clerkuserId", async (ClerkuserId) => {
      const me = await prisma.user.findUnique({
        where: { clerkUserId: ClerkuserId },
        select: { id: true },
      });
      socket.myuserid = me.id;
      // onlineUsers.add(socket.myuserid);
      console.log(`MyuserId ${socket.myuserid}`);
      // console.log("Online users:", Array.from(onlineUsers));
  
      const messagesFromMeToOther = await prisma.chat.findMany({
        where: { sender: socket.myuserid, receiver: socket.userId },
        orderBy: { sentAt: "asc" },
      });
  
      const messagesFromOtherToMe = await prisma.chat.findMany({
        where: { sender: socket.userId, receiver: socket.myuserid },
        orderBy: { sentAt: "asc" },
      });
  
      const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort(
        (a, b) => a.sentAt.getTime() - b.sentAt.getTime()
      );
      socket.emit("All_chat_Solo", allMessages);
    });
  
    socket.on("send_msg", async (IMsgData) => {
      console.log(IMsgData, "DATA");
      const message = await prisma.chat.create({
        data: {
          sender: socket.myuserid,
          receiver: socket.userId,
          message: IMsgData,
        },
      });
      socket.emit("receive_msg", message);
    });
  
    socket.on("disconnect", () => {
      console.log(`disconnected: ${socket.myuserid}`);
      // onlineUsers.delete(socket.myuserid);
    });
  });

exports.expressServer = httpServer.listen(process.env.PORT, () =>
    console.log(`Listening ${process.env.PORT} SocketIO...`)
);