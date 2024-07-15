const handleSetUserId = async (socket, prisma, userId) => {
    socket.userId = userId;
    console.log(`User I Chat With: ${socket.userId}`);
    try {
      const UserItalk = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { FirstName: true, LastName: true, imageUrl: true },
      });
      socket.emit("user-detail", {
        username: `${UserItalk.FirstName} ${UserItalk.LastName}`,
        imageUrl: UserItalk.imageUrl,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };
  
  const handleJoinRoom = (socket, roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`User Id chat with ${socket.userId} joined room ${roomId}`);
  };
  
  const handleClerkUserId = async (socket, prisma, ClerkuserId, onlineUsers, userSockets, io) => {
    try {
      const me = await prisma.user.findUnique({
        where: { clerkUserId: ClerkuserId },
        select: { id: true, imageUrl: true, FirstName: true, LastName: true, clerkUserId: true,newUser:true },
      });
      socket.myuserid = me.id;
      if (socket.myuserid) {
        userSockets[socket.myuserid] = socket.id;
        onlineUsers.add(socket.myuserid);
        io.emit("user_online_status", {
          userId: socket.myuserid,
          imageUrl: me.imageUrl,
          username: me.FirstName + " " + me.LastName,
          clerkuserId: me.clerkUserId,
          status: true,
        });
        const verified=me.newUser
        socket.emit("profile_status",verified)
        io.emit("current_online_usersID", Array.from(onlineUsers));
      }
    } catch (error) {
      console.error("Error fetching clerk user ID:", error);
    }
  };
  
  const handleCheckOnlineStatus = (socket, onlineUsers) => {
    const isOnline = onlineUsers.has(socket.userId);
    socket.emit("already_online_status", isOnline);
  };
  
  const handleOldChats = async (socket, prisma) => {
    try {
      const messagesFromMeToOther = await prisma.chat.findMany({
        where: { sender: socket.myuserid, receiver: socket.userId },
        orderBy: { sentAt: "asc" },
      });
  
      const messagesFromOtherToMe = await prisma.chat.findMany({
        where: { sender: socket.userId, receiver: socket.myuserid },
        orderBy: { sentAt: "asc" },
      });
  
      const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort(
        (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
      );
      socket.emit("Giving_old_chats", allMessages);
    } catch (error) {
      console.error("Error fetching old chats:", error);
    }
  };
  
  const handleAllChattedUsers = (socket, onlineUsers) => {
    socket.emit("current_online_usersID", Array.from(onlineUsers));
  };
  
  const handleSendMessage = async (socket, prisma, IMsgData, onlineUsers, userSockets, io) => {
    try {
      const message = await prisma.chat.create({
        data: {
          sender: socket.myuserid,
          receiver: socket.userId,
          message: IMsgData,
        },
      });
  
      socket.emit("receive_msg", message);
      if (onlineUsers.has(socket.userId)) {
        const receiverSocketId = userSockets[socket.userId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_msg", message);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  const handleDisconnect = (socket, onlineUsers, userSockets, io) => {
    console.log(`disconnected: ${socket.myuserid}`);
    onlineUsers.delete(socket.myuserid);
    delete userSockets[socket.userId];
    io.emit("user_online_status", { userId: socket.myuserid, status: false });
    io.emit("current_online_usersID", Array.from(onlineUsers));
  };
  
  module.exports = {
    handleSetUserId,
    handleJoinRoom,
    handleClerkUserId,
    handleCheckOnlineStatus,
    handleOldChats,
    handleAllChattedUsers,
    handleSendMessage,
    handleDisconnect,
  };
  