import cron from "node-cron";
import { User } from "../model/user.model.js";
import { PlatformSetting } from "../model/platformSetting.model.js";

const DEFAULT_DAILY_WASH_LIMIT = 7;

const resolveProviderDailyWashLimitMax = (provider, platformMax) => {
  const providerMax = Number(provider?.dailyWashLimitMax);
  return Number.isInteger(providerMax) && providerMax > 0 ? providerMax : platformMax;
};
const getDailyWashLimitMax = async () => {
  const settings = await PlatformSetting.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const value = Number(settings?.dailyWashLimitMax);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_DAILY_WASH_LIMIT;
};

export const washerDailyResetCron = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Washer daily reset started...");

      const dailyWashLimitMax = await getDailyWashLimitMax();

      const providers = await User.find({ role: "provider" })
        .select("_id dailyWashLimitMax")
        .lean();

      if (providers.length) {
        await User.bulkWrite(
          providers.map((provider) => ({
            updateOne: {
              filter: { _id: provider._id },
              update: {
                $set: {
                  dailyWashLimit: resolveProviderDailyWashLimitMax(provider, dailyWashLimitMax),
                  isOnline: false,
                  isBusy: false,
                },
              },
            },
          }))
        );
      }

      console.log("Washer daily reset completed");
    } catch (error) {
      console.error("Washer cron failed:", error);
    }
  });
};
