import { Service } from "../model/service.model.js";
import { User } from "../model/user.model.js";

const defaultServices = [
  {
    catalogKey: "basic-wash",
    serviceType: "basic",
    title: "Basic Wash",
    price: 8,
    carSize: "small",
    carName: "Any car",
    carModel: "Any model",
    description: "Quick exterior wash for standard testing and first bookings.",
    isActive: true,
  },
  {
    catalogKey: "exterior-wash",
    serviceType: "basic",
    title: "Exterior Wash",
    price: 10,
    carSize: "medium",
    carName: "Any car",
    carModel: "Any model",
    description: "Foam wash, rinse, wheels, windows, and hand dry.",
    isActive: true,
  },
  {
    catalogKey: "interior-dry-wash",
    serviceType: "standard",
    title: "Interior Dry Wash",
    price: 12,
    carSize: "medium",
    carName: "Any car",
    carModel: "Any model",
    description: "Interior vacuum, dusting, mats, dashboard, and dry wipe.",
    isActive: true,
  },
  {
    catalogKey: "standard-wash",
    serviceType: "standard",
    title: "Standard Wash",
    price: 12,
    carSize: "medium",
    carName: "Any car",
    carModel: "Any model",
    description: "Balanced exterior wash with wheels, glass, and hand dry.",
    isActive: true,
  },
  {
    catalogKey: "standard-full-wash",
    serviceType: "standard",
    title: "Standard Full Wash",
    price: 15,
    carSize: "medium",
    carName: "Any car",
    carModel: "Any model",
    description: "Exterior wash with extra attention to wheels and glass.",
    isActive: true,
  },
  {
    catalogKey: "premium-wash",
    serviceType: "premium",
    title: "Premium Wash",
    price: 18,
    carSize: "high",
    carName: "Any car",
    carModel: "Any model",
    description: "Premium exterior finish for larger or high-care vehicles.",
    isActive: true,
  },
  {
    catalogKey: "premium-detail",
    serviceType: "premium",
    title: "Premium Detail",
    price: 22,
    carSize: "high",
    carName: "Any car",
    carModel: "Any model",
    description: "Full wash, interior clean, trim wipe, tyres, and final finish.",
    isActive: true,
  },
  {
    catalogKey: "engine-bay-clean",
    serviceType: "premium",
    title: "Engine Bay Clean",
    price: 18,
    carSize: "medium",
    carName: "Any car",
    carModel: "Any model",
    description: "Careful dry engine bay clean and visible surface wipe-down.",
    isActive: true,
  },
  {
    catalogKey: "large-vehicle-wash",
    serviceType: "premium",
    title: "Large Vehicle Wash",
    price: 25,
    carSize: "high",
    carName: "SUV or van",
    carModel: "Any model",
    description: "Extended wash for SUVs, vans, and larger family vehicles.",
    isActive: true,
  },
];

const globalServiceFilter = {
  $or: [{ provider: null }, { provider: { $exists: false } }],
};

export const toPlainServices = (services) =>
  services.map((service) =>
    typeof service?.toObject === "function" ? service.toObject() : service
  );

export const ensureDefaultServices = async () => {
  for (const defaultService of defaultServices) {
    let service = await Service.findOne({
      catalogKey: defaultService.catalogKey,
      ...globalServiceFilter,
    });

    service ??= await Service.findOne({
      title: defaultService.title,
      serviceType: defaultService.serviceType,
      ...globalServiceFilter,
    });

    if (service) {
      Object.assign(service, defaultService, { provider: null });
      await service.save();
    } else {
      await Service.create({ ...defaultService, provider: null });
    }
  }

  return Service.find({ isActive: true, ...globalServiceFilter }).sort({
    price: 1,
  });
};

export const syncProviderPreferredServices = async (providerId) => {
  const activeServices = await Service.find({
    provider: providerId,
    isActive: true,
  }).select("_id");

  await User.findByIdAndUpdate(providerId, {
    $set: { preferredServices: activeServices.map((service) => service._id) },
  });

  return activeServices;
};

export const ensureProviderServices = async (providerId) => {
  const defaultCatalog = await ensureDefaultServices();
  let providerServices = await Service.find({ provider: providerId }).sort({
    price: 1,
  });

  const existingCatalogKeys = new Set(
    providerServices
      .map((service) => service.catalogKey)
      .filter((catalogKey) => Boolean(catalogKey))
  );

  const missingDefaults = defaultCatalog.filter(
    (service) =>
      service.catalogKey && !existingCatalogKeys.has(service.catalogKey)
  );

  if (missingDefaults.length > 0) {
    const clonedServices = await Service.insertMany(
      missingDefaults.map((service) => ({
        catalogKey: service.catalogKey,
        serviceType: service.serviceType,
        title: service.title,
        price: service.price,
        carSize: service.carSize,
        carName: service.carName,
        carModel: service.carModel,
        description: service.description,
        isActive: true,
        provider: providerId,
      }))
    );

    providerServices = [...providerServices, ...clonedServices];
  }

  await syncProviderPreferredServices(providerId);

  return Service.find({ provider: providerId }).sort({ price: 1 });
};
