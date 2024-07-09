const { createServer } = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

// Create server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// MongoDB Connection URI
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let onlineUsers = new Set();

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

connectToMongoDB();

io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);

  socket.on("set_user_id", async (userId) => {
    socket.userId = userId;
    console.log(`User I Chat With: ${socket.userId}`);

    try {
      const db = client.db("showoff"); // Replace with your database name
      const collection = db.collection("users");  
      
      // Convert socket.userId to ObjectId
      const user = await collection.findOne({ id: socket.userId });

      if (user) {
        socket.emit("user-detail", {
          username: `${user.FirstName} ${user.LastName}`,
          imageUrl: user.imageUrl,
        });
      } else {
        console.log(`User not found for id: ${socket.userId}`);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  });

  socket.on("check_online_status", () => {
    const isOnline = onlineUsers.has(socket.userId);
    socket.emit("online_status", isOnline);
  });

  socket.on("clerkuserId", async (ClerkuserId) => {
    console.log(`Received clerkuserId: ${ClerkuserId}`);

    try {
      const db = client.db("showoff"); // Replace with your database name
      const collection = db.collection("User");

      const me = await collection.findOne({ clerkUserId: ClerkuserId });

      if (me) {
        socket.myuserid = me._id.toString(); // Assuming _id is stored as ObjectId
        onlineUsers.add(socket.myuserid);
        console.log(`MyuserId ${socket.myuserid}`);
        console.log("Online users:", Array.from(onlineUsers));
        console.log("")
        const chatCollection = db.collection("Chat");

        const messagesFromMeToOther = await chatCollection.find({
          sender: socket.myuserid,
          receiver: socket.userId,
        }).sort({ sentAt: 1 }).toArray();

        const messagesFromOtherToMe = await chatCollection.find({
          sender: socket.userId,
          receiver: socket.myuserid,
        }).sort({ sentAt: 1 }).toArray();

        const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort(
          (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
        );

        socket.emit("All_chat_Solo", allMessages);
      } else {
        console.log(`User not found for clerkUserId: ${ClerkuserId}`);
      }
    } catch (error) {
      console.error("Error fetching clerkuserId:", error);
    }
  });

  socket.on("send_msg", async (IMsgData) => {
    console.log(IMsgData, "DATA");

    try {
      const db = client.db("showoff");
      const collection = db.collection("Chat");

      const message = {
        sender: socket.myuserid,
        receiver: socket.userId,
        message: IMsgData
      };

      const result = await collection.insertOne(message);
      const insertedMessage = result.ops[0];

      socket.emit("receive_msg", insertedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`disconnected: ${socket.myuserid}`);
    onlineUsers.delete(socket.myuserid);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
