import { MongoClient } from 'mongodb';
import { VehicleTypeEnum, VEHICLE_CAPACITY } from '../libs/shared/src/enums';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// MongoDB connection URI from environment variables
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/urcab';

// Function to calculate default price per KM based on vehicle type
function getDefaultPricePerKM(vehicleType: string): number {
  // Basic price tiers based on vehicle type category
  switch (vehicleType) {
    // Economy tier
    case VehicleTypeEnum.SEDAN:
    case VehicleTypeEnum.HATCHBACK:
    case VehicleTypeEnum.COMPACT:
      return 1.0;

    // Comfort tier
    case VehicleTypeEnum.SUV_SMALL:
    case VehicleTypeEnum.CROSSOVER:
    case VehicleTypeEnum.ESTATE:
    case VehicleTypeEnum.TAXI:
      return 1.5;

    // Premium tier
    case VehicleTypeEnum.SUV_LARGE:
    case VehicleTypeEnum.LUXURY_SEDAN:
    case VehicleTypeEnum.EXECUTIVE:
      return 2.0;

    // XL/Family tier
    case VehicleTypeEnum.MPV:
    case VehicleTypeEnum.MINIVAN:
      return 2.5;

    // Special tier
    case VehicleTypeEnum.VAN:
    case VehicleTypeEnum.MICROBUS:
    case VehicleTypeEnum.PICKUP_TRUCK:
    case VehicleTypeEnum.TRUCK:
      return 3.0;

    // Accessible tier
    case VehicleTypeEnum.WHEELCHAIR_ACCESSIBLE:
      return 2.0;

    // Luxury tier
    case VehicleTypeEnum.LUXURY_SUV:
    case VehicleTypeEnum.LIMOUSINE:
      return 4.0;

    // Eco tier
    case VehicleTypeEnum.ELECTRIC_CAR:
    case VehicleTypeEnum.HYBRID:
      return 1.8;

    // Default
    default:
      return 1.5;
  }
}

async function seedVehicleTypes() {
  let client: MongoClient | null = null;

  try {
    // Connect to MongoDB
    // console.log('Connecting to MongoDB at:', mongoUri);
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected to MongoDB successfully');

    const database = client.db('urcab');
    const vehicleTypesCollection = database.collection('vehicleType');

    // Get all vehicle types from the enum
    const vehicleTypeEnumValues = Object.values(VehicleTypeEnum);
    console.log(`Found ${vehicleTypeEnumValues.length} vehicle types in enum`);

    // Check if vehicle types collection is empty
    const existingCount = await vehicleTypesCollection.countDocuments();
    // const ff = await vehicleTypesCollection.find().toArray();
    // console.log('ff', ff);
    if (existingCount > 0) {
      console.log(`${existingCount} vehicle types already exist in database`);
      const shouldOverwrite = process.argv.includes('--overwrite');

      if (!shouldOverwrite) {
        console.log('Skipping seed (use --overwrite flag to replace existing records)');
        return;
      }
      console.log('Overwriting existing vehicle types...');
    }

    // Prepare vehicle types data
    const now = new Date();
    const vehicleTypesToSeed = vehicleTypeEnumValues.map((type) => ({
      name: type,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} vehicle`,
      pricePerKM: getDefaultPricePerKM(type),
      capacity: VEHICLE_CAPACITY[type],
      iconUrl: `https://images.unsplash.com/photo-1533106418989-88406c7cc8ca`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    // Clear existing records if --overwrite flag is set
    if (process.argv.includes('--overwrite')) {
      await vehicleTypesCollection.deleteMany({});
    }

    // Insert new vehicle types
    const result = await vehicleTypesCollection.insertMany(vehicleTypesToSeed);

    console.log('result', result);
    console.log(`Successfully seeded ${result.insertedCount} vehicle types`);
  } catch (error) {
    console.error('Error seeding vehicle types:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the seed function
seedVehicleTypes().catch(console.error);
