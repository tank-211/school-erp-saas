import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get all settings
export const getAllSettingsService = async () => {
  return await prisma.setting.findMany();
};

// Get settings by category
export const getSettingsByCategoryService = async (category) => {
  return await prisma.setting.findMany({
    where: { category },
  });
};

// Update single setting
export const updateSettingsService = async (category, key, value) => {
  return await prisma.setting.update({
    where: { key },
    data: { category, value },
  });
};

// Bulk update
export const bulkUpdateSettingsService = async (settingsArray) => {
  const results = await Promise.all(
    settingsArray.map((setting) =>
      prisma.setting.update({
        where: { key: setting.key },
        data: {
          category: setting.category,
          value: setting.value,
        },
      })
    )
  );

  return results;
};