import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  FirebaseNotificationService,
  RideRepository,
  RideStatus,
  RideNotificationData,
  UserRepository,
  VehicleRepository,
} from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
// import * as admin from 'firebase-admin';

interface RideRequest {
  rideId: string;
  passengerId: string;
  driverId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhoto: string;
  passengerCount?: any;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  requestTime: string;
  expiresAt: string;
}

interface DriverResponse {
  rideId: string;
  driverId: string;
  action: 'accept' | 'reject';
  responseTime: string;
}

@Injectable()
export class FirebaseRideService {
  private readonly logger = new Logger(FirebaseRideService.name);

  constructor(
    @InjectFirebaseAdmin() private readonly admin: FirebaseAdmin,
    private readonly firebaseNotificationService: FirebaseNotificationService,
    private readonly rideRepository: RideRepository,
    private readonly userRepository: UserRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  /**
   * Send ride request to selected driver via Firebase
   */
  async sendRideRequestToDriver(rideRequest: RideRequest, driverFcmToken: string): Promise<void> {
    try {
      // console.log(rideRequest, '=====ride Request data=====');
      // 1. Store ride request in Firebase Realtime Database
      await this.storeRideRequestInFirebase(rideRequest);

      // 2. Send FCM notification to driver using existing service
      const notificationData: RideNotificationData = {
        rideId: rideRequest.rideId,
        passengerId: rideRequest.passengerId,
        passengerName: rideRequest.passengerName,
        passengerPhone: rideRequest.passengerPhone,
        passengerPhoto: rideRequest.passengerPhoto,
        passengerCount: rideRequest.passengerCount,
        pickupLocation: rideRequest.pickupLocation,
        dropoffLocation: rideRequest.dropoffLocation,
        estimatedFare: rideRequest.estimatedFare,
        estimatedDistance: rideRequest.estimatedDistance,
        estimatedDuration: rideRequest.estimatedDuration,
        distanceToPickup: 0, // Will be calculated
        estimatedArrivalTime: 0, // Will be calculated
      };

      await this.firebaseNotificationService.sendRideRequestToDriver(
        driverFcmToken,
        new Types.ObjectId(rideRequest.driverId),
        notificationData,
      );

      this.logger.log(`Ride request ${rideRequest.rideId} sent to driver ${rideRequest.driverId}`);

      // 3. Set up auto-expiry (30 seconds)
      setTimeout(async () => {
        await this.handleRideRequestExpiry(rideRequest.rideId);
      }, 60000);
    } catch (error) {
      this.logger.error(`Failed to send ride request: ${error.message}`);
      throw new BadRequestException(`Failed to send ride request: ${error.message}`);
    }
  }

  /**
   * Store ride request in Firebase Realtime Database
   */
  private async storeRideRequestInFirebase(rideRequest: RideRequest): Promise<void> {
    try {
      const database = this.admin.database;

      // Store under both ride requests and driver's pending requests
      const updates = {};
      // updates[`/ride_requests/${rideRequest.rideId}`] = {
      //   ...rideRequest,
      //   status: 'pending',
      //   createdAt: new Date().toISOString(),
      // };
      // updates[`/driver_requests/${rideRequest.driverId}/${rideRequest.rideId}`] = {
      //   rideId: rideRequest.rideId,
      //   status: 'pending',
      //   expiresAt: rideRequest.expiresAt,
      //   createdAt: new Date().toISOString(),
      // };
      // updates[`/passenger_requests/${rideRequest.passengerId}/${rideRequest.rideId}`] = {
      //   rideId: rideRequest.rideId,
      //   driverId: rideRequest.driverId,
      //   status: 'waiting_response',
      //   createdAt: new Date().toISOString(),
      // };

      updates[`/ride_requests/${rideRequest.rideId}`] = {
        ...rideRequest,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // 2. Store under ride_requests/driver_{driverId} for driver's real-time listener
      // This matches the React Native RealtimeService.listenForRideRequests() structure
      updates[`/ride_requests/driver_${rideRequest.driverId}/${rideRequest.rideId}`] = {
        requestId: rideRequest.rideId, // Add requestId for React Native
        rideId: rideRequest.rideId,
        passengerId: rideRequest.passengerId,
        passengerName: rideRequest.passengerName,
        passengerPhone: rideRequest.passengerPhone,
        pickupLocation: rideRequest.pickupLocation,
        dropoffLocation: rideRequest.dropoffLocation,
        estimatedFare: rideRequest.estimatedFare,
        estimatedDistance: rideRequest.estimatedDistance,
        estimatedDuration: rideRequest.estimatedDuration,
        requestTime: rideRequest.requestTime,
        expiresAt: rideRequest.expiresAt,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Store under ride_status_updates/passenger_{passengerId} for passenger's real-time updates
      // This matches the React Native RealtimeService.listenForRideStatusUpdates() structure
      updates[`/ride_status_updates/passenger_${rideRequest.passengerId}/${rideRequest.rideId}`] = {
        rideId: rideRequest.rideId,
        driverId: rideRequest.driverId,
        status: 'PENDING_DRIVER_ACCEPTANCE',
        message: 'Waiting for driver response...',
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      };

      await database.ref().update(updates);
      this.logger.log(`Stored ride request ${rideRequest.rideId} in Firebase`);
    } catch (error) {
      this.logger.error(`Failed to store ride request in Firebase: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle driver response (accept/reject)
   */
  async handleDriverResponse(rideId: string, driverId: string, action: 'accept' | 'reject'): Promise<void> {
    console.log(rideId, '===incoming from driver app====', driverId, action);
    try {
      const database = this.admin.database;
      // Get ride request details
      const rideRequestRef = database.ref(`/ride_requests/driver_${driverId}/${rideId}`);
      const snapshot = await rideRequestRef.once('value');
      const rideRequest = snapshot.val();

      if (!rideRequest) {
        throw new BadRequestException('Ride request not found or expired');
      }

      if (rideRequest.status !== 'pending') {
        throw new BadRequestException('Ride request is no longer available');
      }

      // Update Firebase with driver response
      const updates = {};
      // updates[`/ride_requests/${rideId}/status`] = action === 'accept' ? 'accepted' : 'rejected';
      // updates[`/ride_requests/${rideId}/responseTime`] = new Date().toISOString();
      // updates[`/driver_requests/${driverId}/${rideId}/status`] = action === 'accept' ? 'accepted' : 'rejected';
      // updates[`/passenger_requests/${rideRequest.passengerId}/${rideId}/status`] =
      //   action === 'accept' ? 'accepted' : 'rejected';

      // await database.ref().update(updates);

      // if (action === 'accept') {
      //   // Accept ride - update MongoDB
      //   await this.acceptRide(rideId, driverId, rideRequest.passengerId);

      //   // Notify passenger of acceptance
      //   await this.notifyPassengerRideAccepted(rideRequest);
      // } else {
      //   // Reject ride - update MongoDB and notify passenger
      //   await this.rejectRide(rideId, driverId);
      //   await this.notifyPassengerRideRejected(rideRequest);
      // }

      // Clean up Firebase data

      updates[`status`] = action === 'accept' ? 'driver-accepted' : 'driver-rejected';
      updates[`responseTime`] = new Date().toISOString();

      // Remove from driver's pending requests (it will be cleaned up by React Native)
      // updates[`/ride_requests/driver_${driverId}/${rideId}`] = null;

      // Send status update to passenger using the correct structure
      if (action === 'accept') {
        // Accept ride - update MongoDB first

        // Get driver info for passenger notification
        const driver = await this.getUserById(driverId);
        const driverVehicle = await this.getVehicleByDriverId(driverId);

        // Send acceptance notification to passenger
        updates[`status`] = RideStatus.DRIVER_ACCEPTED;
        updates[`driverInfo`] = driver
          ? {
              name: `${driver.firstName} ${driver.lastName}`,

              phone: driver.phone,
              photo: driver.photo,
              vehicle: driverVehicle, // You'll need to include vehicle info
            }
          : null;

        updates[`updatedAt`] = Date.now();

        rideRequestRef.update(updates);
      } else {
        // Reject ride - update MongoDB
        await this.rejectRide(rideId, driverId);

        // Send rejection notification to passenger
        // updates[`/ride_status_updates/passenger_${rideRequest.passengerId}/${Date.now()}`] = {
        //   rideId: rideId,
        //   driverId: driverId,
        //   status: 'REJECTED_BY_DRIVER',
        //   message: 'Driver declined your request. We are finding another driver for you.',
        //   timestamp: Date.now(),
        //   createdAt: new Date().toISOString(),
        // };
        updates[`status`] = RideStatus.REJECTED_BY_DRIVER;
        updates[`updatedAt`] = Date.now();
        rideRequestRef.update(updates);
      }
      setTimeout(async () => {
        // await this.cleanupFirebaseRideRequest(rideId, rideRequest.passengerId, driverId);
      }, 5000);

      // return true
    } catch (error) {
      this.logger.error(`Failed to handle driver response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept ride and update database
   */
  private async acceptRide(rideId: string, driverId: string, passengerId: string): Promise<void> {
    try {
      await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        {
          driverId: new Types.ObjectId(driverId),
          status: RideStatus.DRIVER_ACCEPTED,
          driverAssignedAt: new Date(),
        },
      );

      this.logger.log(`Ride ${rideId} accepted by driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to accept ride: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject ride and update database
   */
  private async rejectRide(rideId: string, driverId: string): Promise<void> {
    try {
      await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        {
          status: RideStatus.REJECTED_BY_DRIVER,
          rejectedBy: new Types.ObjectId(driverId),
          rejectedAt: new Date(),
        },
      );

      this.logger.log(`Ride ${rideId} rejected by driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to reject ride: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle ride request expiry
   */
  private async handleRideRequestExpiry(rideId: string): Promise<void> {
    try {
      const database = this.admin.database;
      const rideRequestRef = database.ref(`/ride_requests/${rideId}`);
      const snapshot = await rideRequestRef.once('value');
      const rideRequest = await this.rideRepository.findById(rideId);

      if (rideRequest && rideRequest.status === 'pending') {
        // Mark as expired in Firebase

        await rideRequestRef.update({
          status: 'expired',
          expiredAt: new Date().toISOString(),
        });

        // Remove from driver's queue
        const driverRequestUpdate = {};
        driverRequestUpdate[`/ride_requests/driver_${rideRequest.driverId}/${rideId}`] = {
          status: RideStatus.REJECTED_BY_DRIVER,
          updatedAt: new Date().toISOString(),
        };
        await database.ref().update(driverRequestUpdate);

        // Update MongoDB
        await this.rideRepository.findOneAndUpdate(
          { _id: new Types.ObjectId(rideId) },
          {
            status: RideStatus.REJECTED_BY_DRIVER,
            cancelledAt: new Date(),
            cancelReason: 'Driver did not respond in time',
          },
        );

        // Notify passenger about expiry using correct structure
        // const passengerUpdate = {};
        // passengerUpdate[`/ride_status_updates/passenger_${rideRequest.passengerId}/${Date.now()}`] = {
        //   rideId: rideId,
        //   driverId: rideRequest.driverId,
        //   status: 'REJECTED_BY_DRIVER',
        //   message: 'Driver did not respond in time. Please select another driver.',
        //   reason: 'Driver did not respond in time',
        //   timestamp: Date.now(),
        //   createdAt: new Date().toISOString(),
        // };

        // await database.ref().update(passengerUpdate);

        this.logger.log(`Ride request ${rideId} expired`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle ride request expiry: ${error.message}`);
    }
  }

  /**
   * Notify passenger that ride was accepted
   */
  private async notifyPassengerRideAccepted(rideRequest: any): Promise<void> {
    try {
      // Store passenger notification in Firebase for real-time updates
      const database = this.admin.database;

      await database.ref(`/passenger_notifications/${rideRequest.passengerId}`).push({
        type: 'ride_accepted',
        rideId: rideRequest.rideId,
        driverId: rideRequest.driverId,
        message: 'Your ride request has been accepted!',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Notifying passenger ${rideRequest.passengerId} that ride was accepted`);
    } catch (error) {
      this.logger.error(`Failed to notify passenger: ${error.message}`);
    }
  }

  /**
   * Notify passenger that ride was rejected
   */
  private async notifyPassengerRideRejected(rideRequest: any): Promise<void> {
    try {
      const database = this.admin.database;

      await database.ref(`/passenger_notifications/${rideRequest.passengerId}`).push({
        type: 'ride_rejected',
        rideId: rideRequest.rideId,
        driverId: rideRequest.driverId,
        message: 'Driver is unavailable. Please select another driver.',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Notifying passenger ${rideRequest.passengerId} that ride was rejected`);
    } catch (error) {
      this.logger.error(`Failed to notify passenger: ${error.message}`);
    }
  }

  /**
   * Notify passenger that ride request expired
   */
  private async notifyPassengerRideExpired(rideRequest: any): Promise<void> {
    try {
      const database = this.admin.database;

      await database.ref(`/passenger_notifications/${rideRequest.passengerId}`).push({
        type: 'ride_expired',
        rideId: rideRequest.rideId,
        driverId: rideRequest.driverId,
        message: 'Driver did not respond in time. Please select another driver.',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Notifying passenger ${rideRequest.passengerId} that ride request expired`);
    } catch (error) {
      this.logger.error(`Failed to notify passenger: ${error.message}`);
    }
  }

  /**
   * Clean up Firebase ride request data
   */
  private async cleanupFirebaseRideRequest(rideId: string, passengerId: string, driverId: string): Promise<void> {
    try {
      const database = this.admin.database;

      const updates = {};
      // updates[`/ride_requests/${rideId}`] = null;
      updates[`/ride_requests/${driverId}/${rideId}`] = null;
      updates[`/passenger_requests/${passengerId}/${rideId}`] = null;

      await database.ref().update(updates);
      this.logger.log(`Cleaned up Firebase data for ride ${rideId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup Firebase data: ${error.message}`);
    }
  }

  private async getUserById(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error.message);
      return null;
    }
  }
  private async getVehicleByDriverId(userId: string): Promise<any> {
    try {
      const user = await this.vehicleRepository.findById(userId);
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Get pending ride requests for a driver
   */
  async getDriverPendingRequests(driverId: string): Promise<any[]> {
    try {
      const database = this.admin.database;

      // Use the correct path that matches React Native listener
      const snapshot = await database.ref(`/ride_requests/driver_${driverId}`).once('value');
      const requests = snapshot.val() || {};

      return Object.keys(requests).map((rideId) => ({
        rideId,
        requestId: rideId, // Add requestId for compatibility
        ...requests[rideId],
      }));
    } catch (error) {
      this.logger.error(`Failed to get driver pending requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Listen to driver responses in real-time
   */
  setupDriverResponseListener(driverId: string, callback: (response: DriverResponse) => void): void {
    try {
      const database = this.admin.database;

      const ref = database.ref(`/driver_responses/${driverId}`);

      ref.on('child_added', (snapshot) => {
        const response = snapshot.val();
        if (response) {
          callback(response);
          // Clean up the response after processing
          snapshot.ref.remove();
        }
      });
    } catch (error) {
      this.logger.error(`Failed to setup driver response listener: ${error.message}`);
    }
  }

  /**
   * Send driver response
   */
  async sendDriverResponse(driverId: string, rideId: string, action: 'accept' | 'reject'): Promise<void> {
    try {
      await this.handleDriverResponse(rideId, driverId, action);
    } catch (error) {
      this.logger.error(`Failed to send driver response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get passenger notifications
   */
  async getPassengerNotifications(passengerId: string): Promise<any[]> {
    try {
      const database = this.admin.database;

      const snapshot = await database.ref(`/passenger_notifications/${passengerId}`).once('value');
      const notifications = snapshot.val() || {};

      return Object.keys(notifications).map((key) => ({
        id: key,
        ...notifications[key],
      }));
    } catch (error) {
      this.logger.error(`Failed to get passenger notifications: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear passenger notifications
   */
  async clearPassengerNotifications(passengerId: string): Promise<void> {
    try {
      const database = this.admin.database;

      // Clear status updates that are older than 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const snapshot = await database.ref(`/ride_status_updates/passenger_${passengerId}`).once('value');
      const updates = snapshot.val() || {};

      const cleanupUpdates = {};
      Object.keys(updates).forEach((key) => {
        if (updates[key].timestamp < fiveMinutesAgo) {
          cleanupUpdates[`/ride_status_updates/passenger_${passengerId}/${key}`] = null;
        }
      });

      if (Object.keys(cleanupUpdates).length > 0) {
        await database.ref().update(cleanupUpdates);
      }
    } catch (error) {
      this.logger.error(`Failed to clear passenger notifications: ${error.message}`);
    }
  }

  /**
   * Get passenger ride status updates
   */
  async getPassengerRideStatus(passengerId: string, rideId?: string): Promise<any> {
    try {
      const database = this.admin.database;

      if (rideId) {
        // Get specific ride status
        const snapshot = await database.ref(`/ride_status_updates/passenger_${passengerId}`).once('value');
        const updates = snapshot.val() || {};

        // Find the latest update for this ride
        const rideUpdates = Object.keys(updates)
          .map((key) => ({ id: key, ...updates[key] }))
          .filter((update) => update.rideId === rideId)
          .sort((a, b) => b.timestamp - a.timestamp);

        return rideUpdates.length > 0 ? rideUpdates[0] : null;
      } else {
        // Get all status updates for passenger
        const snapshot = await database.ref(`/ride_status_updates/passenger_${passengerId}`).once('value');
        const updates = snapshot.val() || {};

        return Object.keys(updates).map((key) => ({
          id: key,
          ...updates[key],
        }));
      }
    } catch (error) {
      this.logger.error(`Failed to get passenger ride status: ${error.message}`);
      return null;
    }
  }
}
