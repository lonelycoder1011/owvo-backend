import mongoose from "mongoose";
import { Booking } from "../model/booking.model.js";
import { User } from "../model/user.model.js";

export const emptyCompletedJobs = () => ({
  today: 0,
  week: 0,
  yearly: 0,
  allTime: 0,
});

const startOfDay = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date = new Date()) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? 6 : day - 1;
  value.setDate(value.getDate() - diff);
  return value;
};

const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1);

const normalizeProviderIds = (providerIds = []) =>
  providerIds
    .filter(Boolean)
    .map((providerId) =>
      typeof providerId === "string" && mongoose.Types.ObjectId.isValid(providerId)
        ? new mongoose.Types.ObjectId(providerId)
        : providerId
    );

export const getProviderCompletedJobCounts = async (providerIds = []) => {
  const ids = normalizeProviderIds(providerIds);
  if (!ids.length) return new Map();

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const yearStart = startOfYear(now);

  const rows = await Booking.aggregate([
    { $match: { provider: { $in: ids }, status: "completed" } },
    {
      $addFields: {
        completedJobDate: { $ifNull: ["$completedAt", "$updatedAt"] },
      },
    },
    {
      $group: {
        _id: "$provider",
        allTime: { $sum: 1 },
        today: {
          $sum: { $cond: [{ $gte: ["$completedJobDate", todayStart] }, 1, 0] },
        },
        week: {
          $sum: { $cond: [{ $gte: ["$completedJobDate", weekStart] }, 1, 0] },
        },
        yearly: {
          $sum: { $cond: [{ $gte: ["$completedJobDate", yearStart] }, 1, 0] },
        },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      row._id.toString(),
      {
        today: row.today || 0,
        week: row.week || 0,
        yearly: row.yearly || 0,
        allTime: row.allTime || 0,
      },
    ])
  );
};

export const syncProviderCompletedJobs = async (providerId) => {
  if (!providerId) return emptyCompletedJobs();

  const providerKey = providerId.toString();
  const counts = await getProviderCompletedJobCounts([providerId]);
  const completedJobs = counts.get(providerKey) || emptyCompletedJobs();

  await User.updateOne(
    { _id: providerId },
    {
      $set: {
        "completedJobs.today": completedJobs.today,
        "completedJobs.week": completedJobs.week,
        "completedJobs.yearly": completedJobs.yearly,
        "completedJobs.allTime": completedJobs.allTime,
        "completedJobs.syncedAt": new Date(),
      },
    }
  );

  return completedJobs;
};

export const syncProvidersCompletedJobs = async (providerIds = []) => {
  const ids = normalizeProviderIds(providerIds);
  if (!ids.length) return new Map();

  const counts = await getProviderCompletedJobCounts(ids);
  const syncedAt = new Date();
  await User.bulkWrite(
    ids.map((providerId) => {
      const completedJobs = counts.get(providerId.toString()) || emptyCompletedJobs();
      return {
        updateOne: {
          filter: { _id: providerId },
          update: {
            $set: {
              "completedJobs.today": completedJobs.today,
              "completedJobs.week": completedJobs.week,
              "completedJobs.yearly": completedJobs.yearly,
              "completedJobs.allTime": completedJobs.allTime,
              "completedJobs.syncedAt": syncedAt,
            },
          },
        },
      };
    })
  );

  return counts;
};
