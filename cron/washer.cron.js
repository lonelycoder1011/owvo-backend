import cron from "node-cron";
import { User } from "../model/user.model.js";

const DAILY_WASH_LIMIT = 7; 

export const washerDailyResetCron = () => {
  
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Washer daily reset started...");

      await User.updateMany(
        { role: "provider" },
        {
          $set: {
            dailyWashLimit: DAILY_WASH_LIMIT,
            isOnline: false,
            isBusy: false,
          },
        }
      );

      console.log("Washer daily reset completed");
    } catch (error) {
      console.error("Washer cron failed:", error);
    }
  });
};
