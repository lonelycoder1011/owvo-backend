import { User } from "../model/user.model.js";

const phoneIndexName = "phoneNumber_unique_when_present";

const isLegacyPhoneIndex = (index) =>
  index?.unique === true &&
  index?.key?.phoneNumber === 1 &&
  index.name !== phoneIndexName;

export const ensureUserIndexes = async () => {
  let indexes = [];
  try {
    indexes = await User.collection.indexes();
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound") throw error;
  }

  const legacyPhoneIndexes = indexes.filter(isLegacyPhoneIndex);

  for (const index of legacyPhoneIndexes) {
    console.warn(`Dropping legacy phone index: ${index.name}`);
    await User.collection.dropIndex(index.name);
  }

  await User.collection.createIndex(
    { phoneNumber: 1 },
    {
      unique: true,
      name: phoneIndexName,
      partialFilterExpression: { phoneNumber: { $type: "string", $gt: "" } },
    }
  );
};
