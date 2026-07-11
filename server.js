import cors from "cors";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import { washerDailyResetCron } from "./cron/washer.cron.js";
import router from "./mainroute/index.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";
import { securityHeaders, simpleRateLimit } from "./middleware/security.middleware.js";
import notFound from "./middleware/notFound.js";
import { initSocket } from "./socket/socket.js";
import { ensureUserIndexes } from "./utils/userIndexes.util.js";
import { corsOriginDelegate } from "./utils/allowedOrigins.util.js";


const app = express();

washerDailyResetCron();

app.set("trust proxy", true);
const server = createServer(app);

// ✅ Initialise Socket.io (must come before server.listen)
initSocket(server);

app.use(securityHeaders);
app.use(simpleRateLimit());
app.use(
  cors({
    credentials: true,
    origin: corsOriginDelegate,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "userId"],
  })
);

app.use(
  "/api/v1/payment/webhook/stripe",
  express.raw({ type: "application/json" })
);
app.use(express.json({ limit: "1mb" }));
if (!(process.env.NODE_ENV === "production" || process.env.RENDER)) {
  app.use("/uploads", express.static("uploads"));
}

app.get("/", (req, res) => {
  res.send("Server is running...!!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use("/api/v1", router);
app.use(globalErrorHandler);
app.use(notFound);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, async () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);

  try {
    await mongoose.connect(process.env.MONGO_DB_URL);
    await ensureUserIndexes();
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
});
