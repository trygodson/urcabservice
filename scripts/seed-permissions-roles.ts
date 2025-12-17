import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// MongoDB connection URI from environment variables
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/urcab';

// Define all permissions
const PERMISSIONS = [
  // DRIVERS Category
  { name: 'drivers.view', description: 'View list of drivers', category: 'drivers' },
  { name: 'drivers.view.details', description: 'View detailed driver information', category: 'drivers' },
  { name: 'drivers.create', description: 'Create new driver accounts', category: 'drivers' },
  { name: 'drivers.update', description: 'Update driver information', category: 'drivers' },
  { name: 'drivers.delete', description: 'Delete/deactivate drivers', category: 'drivers' },
  { name: 'drivers.verify', description: 'Verify driver accounts', category: 'drivers' },
  { name: 'drivers.documents.view', description: 'View driver documents', category: 'drivers' },
  { name: 'drivers.documents.approve', description: 'Approve driver documents', category: 'drivers' },
  { name: 'drivers.documents.reject', description: 'Reject driver documents', category: 'drivers' },
  { name: 'drivers.vehicles.view', description: 'View driver vehicles', category: 'drivers' },
  { name: 'drivers.vehicles.approve', description: 'Approve driver vehicles', category: 'drivers' },
  { name: 'drivers.vehicles.reject', description: 'Reject driver vehicles', category: 'drivers' },
  { name: 'drivers.vehicles.documents.view', description: 'View vehicle documents', category: 'drivers' },
  { name: 'drivers.vehicles.documents.approve', description: 'Approve vehicle documents', category: 'drivers' },
  { name: 'drivers.vehicles.documents.reject', description: 'Reject vehicle documents', category: 'drivers' },
  { name: 'drivers.evp.create', description: 'Create Electronic Verification Permits', category: 'drivers' },
  { name: 'drivers.evp.view', description: 'View EVP details', category: 'drivers' },
  { name: 'drivers.evp.revoke', description: 'Revoke EVPs', category: 'drivers' },
  { name: 'drivers.rides.view', description: 'View driver ride history', category: 'drivers' },
  { name: 'drivers.reports.view', description: 'View driver-related issue reports', category: 'drivers' },
  { name: 'drivers.reports.assign', description: 'Assign reports to admins', category: 'drivers' },
  { name: 'drivers.reports.resolve', description: 'Resolve issue reports', category: 'drivers' },
  { name: 'drivers.dashboard.view', description: 'View driver management dashboard stats', category: 'drivers' },
  { name: 'drivers.pending.view', description: 'View pending driver documents/tasks', category: 'drivers' },

  // PASSENGERS Category
  { name: 'passengers.view', description: 'View list of passengers', category: 'passengers' },
  { name: 'passengers.view.details', description: 'View detailed passenger information', category: 'passengers' },
  { name: 'passengers.update', description: 'Update passenger information', category: 'passengers' },
  { name: 'passengers.activate', description: 'Activate passenger accounts', category: 'passengers' },
  { name: 'passengers.deactivate', description: 'Deactivate passenger accounts', category: 'passengers' },
  { name: 'passengers.documents.view', description: 'View passenger documents', category: 'passengers' },
  { name: 'passengers.rides.view', description: 'View passenger ride history', category: 'passengers' },
  { name: 'passengers.reports.view', description: 'View passenger-related issue reports', category: 'passengers' },
  { name: 'passengers.reports.assign', description: 'Assign reports to admins', category: 'passengers' },
  { name: 'passengers.reports.resolve', description: 'Resolve issue reports', category: 'passengers' },
  { name: 'passengers.dashboard.view', description: 'View passenger management dashboard stats', category: 'passengers' },

  // RIDES Category
  { name: 'rides.view', description: 'View all rides', category: 'rides' },
  { name: 'rides.view.details', description: 'View detailed ride information', category: 'rides' },
  { name: 'rides.cancel', description: 'Cancel rides (admin override)', category: 'rides' },
  { name: 'rides.refund', description: 'Process ride refunds', category: 'rides' },
  { name: 'rides.analytics.view', description: 'View ride analytics and statistics', category: 'rides' },

  // VEHICLE_TYPES Category
  { name: 'vehicleTypes.view', description: 'View vehicle types', category: 'vehicleTypes' },
  { name: 'vehicleTypes.create', description: 'Create new vehicle types', category: 'vehicleTypes' },
  { name: 'vehicleTypes.update', description: 'Update vehicle types', category: 'vehicleTypes' },
  { name: 'vehicleTypes.delete', description: 'Delete vehicle types', category: 'vehicleTypes' },
  { name: 'vehicleTypes.pricing.view', description: 'View pricing configurations', category: 'vehicleTypes' },
  { name: 'vehicleTypes.pricing.update', description: 'Update pricing periods and rates', category: 'vehicleTypes' },

  // PRICING_ZONES Category
  { name: 'pricingZones.view', description: 'View pricing zones', category: 'pricingZones' },
  { name: 'pricingZones.create', description: 'Create new pricing zones', category: 'pricingZones' },
  { name: 'pricingZones.update', description: 'Update pricing zones', category: 'pricingZones' },
  { name: 'pricingZones.delete', description: 'Delete pricing zones', category: 'pricingZones' },
  { name: 'pricingZones.location.search', description: 'Search locations for zone creation', category: 'pricingZones' },

  // REPORTS Category
  { name: 'reports.view', description: 'View all issue reports', category: 'reports' },
  { name: 'reports.view.details', description: 'View detailed report information', category: 'reports' },
  { name: 'reports.assign', description: 'Assign reports to admins', category: 'reports' },
  { name: 'reports.resolve', description: 'Resolve issue reports', category: 'reports' },
  { name: 'reports.delete', description: 'Delete issue reports', category: 'reports' },
  { name: 'reports.analytics.view', description: 'View report analytics', category: 'reports' },

  // USERS Category (Super Admin Only)
  { name: 'users.view', description: 'View admin users', category: 'users' },
  { name: 'users.create', description: 'Create new admin users', category: 'users' },
  { name: 'users.update', description: 'Update admin users', category: 'users' },
  { name: 'users.delete', description: 'Delete/deactivate admin users', category: 'users' },
  { name: 'users.roles.assign', description: 'Assign roles to users', category: 'users' },

  // ROLES Category (Super Admin Only)
  { name: 'roles.view', description: 'View roles and permissions', category: 'roles' },
  { name: 'roles.create', description: 'Create new roles', category: 'roles' },
  { name: 'roles.update', description: 'Update roles and permissions', category: 'roles' },
  { name: 'roles.delete', description: 'Delete roles', category: 'roles' },
  { name: 'roles.permissions.manage', description: 'Manage permission assignments', category: 'roles' },

  // SETTINGS Category
  { name: 'settings.view', description: 'View system settings', category: 'settings' },
  { name: 'settings.update', description: 'Update system settings', category: 'settings' },
  { name: 'settings.pricing.manage', description: 'Manage global pricing settings', category: 'settings' },
  { name: 'settings.notifications.manage', description: 'Manage notification settings', category: 'settings' },

  // DASHBOARD Category
  { name: 'dashboard.view', description: 'View main dashboard', category: 'dashboard' },
  { name: 'dashboard.stats.view', description: 'View statistics and metrics', category: 'dashboard' },
  { name: 'dashboard.analytics.view', description: 'View analytics reports', category: 'dashboard' },
  { name: 'dashboard.export', description: 'Export dashboard data', category: 'dashboard' },

  // SYSTEM Category (Super Admin Only)
  { name: 'system.settings.manage', description: 'Manage system-wide settings', category: 'system' },
  { name: 'system.logs.view', description: 'View system logs', category: 'system' },
  { name: 'system.backup.manage', description: 'Manage system backups', category: 'system' },
  { name: 'system.maintenance.manage', description: 'Manage system maintenance mode', category: 'system' },
];

// Define default roles with their permissions
const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: [], // Will be populated with all permission IDs
  },
  {
    name: 'Fleet Manager',
    description: 'Manages drivers, vehicles, and rides',
    isSystemRole: false,
    permissions: [
      'drivers.view',
      'drivers.view.details',
      'drivers.update',
      'drivers.verify',
      'drivers.documents.view',
      'drivers.documents.approve',
      'drivers.documents.reject',
      'drivers.vehicles.view',
      'drivers.vehicles.approve',
      'drivers.vehicles.reject',
      'drivers.vehicles.documents.view',
      'drivers.vehicles.documents.approve',
      'drivers.vehicles.documents.reject',
      'drivers.evp.create',
      'drivers.evp.view',
      'drivers.evp.revoke',
      'drivers.rides.view',
      'drivers.reports.view',
      'drivers.reports.assign',
      'drivers.reports.resolve',
      'drivers.dashboard.view',
      'drivers.pending.view',
      'rides.view',
      'rides.view.details',
      'rides.analytics.view',
      'reports.view',
      'reports.view.details',
      'reports.assign',
      'reports.resolve',
      'dashboard.view',
      'dashboard.stats.view',
      'dashboard.analytics.view',
    ],
  },
  {
    name: 'Support Admin',
    description: 'Handles passenger support and issue resolution',
    isSystemRole: false,
    permissions: [
      'passengers.view',
      'passengers.view.details',
      'passengers.update',
      'passengers.activate',
      'passengers.deactivate',
      'passengers.documents.view',
      'passengers.rides.view',
      'passengers.reports.view',
      'passengers.reports.assign',
      'passengers.reports.resolve',
      'passengers.dashboard.view',
      'drivers.view',
      'drivers.view.details',
      'rides.view',
      'rides.view.details',
      'reports.view',
      'reports.view.details',
      'reports.assign',
      'reports.resolve',
      'dashboard.view',
    ],
  },
  {
    name: 'Finance Admin',
    description: 'Manages financial aspects and analytics',
    isSystemRole: false,
    permissions: [
      'rides.view',
      'rides.view.details',
      'rides.refund',
      'rides.analytics.view',
      'passengers.view',
      'drivers.view',
      'dashboard.view',
      'dashboard.stats.view',
      'dashboard.analytics.view',
      'dashboard.export',
      'reports.view',
      'reports.view.details',
    ],
  },
  {
    name: 'Document Verification Specialist',
    description: 'Specializes in document verification',
    isSystemRole: false,
    permissions: [
      'drivers.documents.view',
      'drivers.documents.approve',
      'drivers.documents.reject',
      'drivers.vehicles.documents.view',
      'drivers.vehicles.documents.approve',
      'drivers.vehicles.documents.reject',
      'passengers.documents.view',
      'drivers.evp.create',
      'drivers.evp.view',
      'drivers.evp.revoke',
      'drivers.pending.view',
      'drivers.view',
      'drivers.view.details',
    ],
  },
  {
    name: 'Read-Only Analyst',
    description: 'View-only access for analytics and reporting',
    isSystemRole: false,
    permissions: [
      'drivers.view',
      'drivers.view.details',
      'passengers.view',
      'passengers.view.details',
      'rides.view',
      'rides.view.details',
      'reports.view',
      'reports.view.details',
      'dashboard.view',
      'dashboard.stats.view',
      'dashboard.analytics.view',
      'dashboard.export',
    ],
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
      console.log(
        `${existingPermissionsCount} permissions and ${existingRolesCount} roles already exist in database`,
      );
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

