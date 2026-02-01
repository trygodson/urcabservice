import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// MongoDB connection URI from environment variables
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/urcab';

// Define all permissions - one permission per menu item for dashboard visibility
const PERMISSIONS = [
  { name: 'menu.dashboard', description: 'Access to Dashboard menu', category: 'menu' },
  { name: 'menu.roles', description: 'Access to Roles Management menu', category: 'menu' },
  { name: 'menu.portalUsers', description: 'Access to Portal Users menu', category: 'menu' },
  { name: 'menu.driverManagement', description: 'Access to Driver Management menu', category: 'menu' },
  { name: 'menu.passengerManagement', description: 'Access to Passenger Management menu', category: 'menu' },
  { name: 'menu.rideManagement', description: 'Access to Ride Management menu', category: 'menu' },
  { name: 'menu.vehicleManagement', description: 'Access to Vehicle Management menu', category: 'menu' },
  { name: 'menu.evp', description: 'Access to EVP menu', category: 'menu' },
  { name: 'menu.zones', description: 'Access to Zones menu', category: 'menu' },
  { name: 'menu.pricing', description: 'Access to Pricing menu', category: 'menu' },
  {
    name: 'menu.driverSubscriptionTransactions',
    description: 'Access to Driver Subscription Transactions menu',
    category: 'menu',
  },
  {
    name: 'menu.withdrawals',
    description: 'Access to Withdrawals menu',
    category: 'menu',
  },
  { name: 'menu.subscriptionPlans', description: 'Access to Subscription Plans menu', category: 'menu' },
  { name: 'menu.passengerTransactions', description: 'Access to Passenger Transactions menu', category: 'menu' },
  { name: 'menu.reports', description: 'Access to Reports menu', category: 'menu' },
  { name: 'menu.faq', description: 'Access to FAQ menu', category: 'menu' },
  { name: 'menu.privacyPolicy', description: 'Access to Privacy & Policy menu', category: 'menu' },
  { name: 'menu.termsConditions', description: 'Access to Terms & Conditions menu', category: 'menu' },
  { name: 'menu.settings', description: 'Access to Settings menu', category: 'menu' },
];

// Define default roles with their permissions
const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full system access with all menu permissions',
    isSystemRole: true,
    permissions: [], // Will be populated with all permission IDs
  },
  {
    name: 'Fleet Manager',
    description: 'Manages drivers, vehicles, rides, and EVP',
    isSystemRole: false,
    permissions: [
      'menu.dashboard',
      'menu.vehicleManagement',
      'menu.driverManagement',
      'menu.rideManagement',
      'menu.evp',
      'menu.reports',
    ],
  },
  {
    name: 'Support Admin',
    description: 'Handles passenger support and issue resolution',
    isSystemRole: false,
    permissions: ['menu.dashboard', 'menu.passengerManagement', 'menu.rideManagement', 'menu.reports'],
  },
  {
    name: 'Finance Admin',
    description: 'Manages financial aspects, transactions, and analytics',
    isSystemRole: false,
    permissions: [
      'menu.dashboard',
      'menu.rideManagement',
      'menu.driverSubscriptionTransactions',
      'menu.subscriptionPlans',
      'menu.passengerTransactions',
      'menu.reports',
    ],
  },
  {
    name: 'Document Verification Specialist',
    description: 'Specializes in document verification and EVP management',
    isSystemRole: false,
    permissions: ['menu.dashboard', 'menu.driverManagement', 'menu.evp'],
  },
  {
    name: 'Read-Only Analyst',
    description: 'View-only access for analytics and reporting',
    isSystemRole: false,
    permissions: [
      'menu.dashboard',
      'menu.driverManagement',
      'menu.passengerManagement',
      'menu.rideManagement',
      'menu.reports',
    ],
  },
  {
    name: 'Pricing Manager',
    description: 'Manages zones and pricing configurations',
    isSystemRole: false,
    permissions: ['menu.dashboard', 'menu.zones', 'menu.pricing'],
  },
  {
    name: 'Content Manager',
    description: 'Manages FAQ, Privacy Policy, and Terms & Conditions',
    isSystemRole: false,
    permissions: ['menu.dashboard', 'menu.faq', 'menu.privacyPolicy', 'menu.termsConditions'],
  },
];

async function seedPermissionsAndRoles() {
  let client: MongoClient | null = null;

  try {
    // Connect to MongoDB
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected to MongoDB successfully');

    const database = client.db('urcab');
    const permissionsCollection = database.collection('permissions');
    const rolesCollection = database.collection('roles');

    // Check if permissions collection is empty
    const existingPermissionsCount = await permissionsCollection.countDocuments();
    const existingRolesCount = await rolesCollection.countDocuments();

    if (existingPermissionsCount > 0 || existingRolesCount > 0) {
      console.log(`${existingPermissionsCount} permissions and ${existingRolesCount} roles already exist in database`);
      const shouldOverwrite = process.argv.includes('--overwrite');

      if (!shouldOverwrite) {
        console.log('Skipping seed (use --overwrite flag to replace existing records)');
        return;
      }
      console.log('Overwriting existing permissions and roles...');
    }

    const now = new Date();

    // Clear existing records if --overwrite flag is set
    if (process.argv.includes('--overwrite')) {
      await permissionsCollection.deleteMany({});
      await rolesCollection.deleteMany({});
    }

    // Insert permissions
    const permissionsToSeed = PERMISSIONS.map((perm) => ({
      ...perm,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    const permissionsResult = await permissionsCollection.insertMany(permissionsToSeed);
    console.log(`Successfully seeded ${permissionsResult.insertedCount} permissions`);

    // Get all inserted permission IDs mapped by name
    const allPermissions = await permissionsCollection.find({}).toArray();
    const permissionMap = new Map(allPermissions.map((p) => [p.name, p._id]));

    // Prepare roles with permission IDs
    const rolesToSeed = DEFAULT_ROLES.map((role) => {
      let permissionIds: any[] = [];

      if (role.name === 'Super Admin') {
        // Super Admin gets all permissions
        permissionIds = allPermissions.map((p) => p._id);
      } else {
        // Map permission names to IDs
        permissionIds = role.permissions
          .map((permName) => permissionMap.get(permName))
          .filter((id) => id !== undefined);
      }

      return {
        name: role.name,
        description: role.description,
        permissions: permissionIds,
        isActive: true,
        isSystemRole: role.isSystemRole,
        createdAt: now,
        updatedAt: now,
      };
    });

    // Insert roles
    const rolesResult = await rolesCollection.insertMany(rolesToSeed);
    console.log(`Successfully seeded ${rolesResult.insertedCount} roles`);

    console.log('\nSeeded Roles:');
    rolesToSeed.forEach((role) => {
      console.log(`  - ${role.name} (${role.permissions.length} permissions)`);
    });
  } catch (error) {
    console.error('Error seeding permissions and roles:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the seed function
seedPermissionsAndRoles().catch(console.error);
