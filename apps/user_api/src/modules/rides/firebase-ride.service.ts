import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FirebaseNotificationService, RideRepository, RideStatus, RideNotificationData } from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
// import * as admin from 'firebase-admin';

interface RideRequest {
  rideId: string;
  passengerId: string;
  driverId: string;
  passengerName: string;
  passengerPhone: string;
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
  ) {}

  /**
   * Send ride request to selected driver via Firebase
   */
  async sendRideRequestToDriver(rideRequest: RideRequest, driverFcmToken: string): Promise<void> {
    try {
      // 1. Store ride request in Firebase Realtime Database
      await this.storeRideRequestInFirebase(rideRequest);

      // 2. Send FCM notification to driver using existing service
      const notificationData: RideNotificationData = {
        rideId: rideRequest.rideId,
        passengerId: rideRequest.passengerId,
        passengerName: rideRequest.passengerName,
        passengerPhone: rideRequest.passengerPhone,
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
      }, 30000);
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
      updates[`/ride_requests/${rideRequest.rideId}`] = {
        ...rideRequest,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      updates[`/driver_requests/${rideRequest.driverId}/${rideRequest.rideId}`] = {
        rideId: rideRequest.rideId,
        status: 'pending',
        expiresAt: rideRequest.expiresAt,
        createdAt: new Date().toISOString(),
      };
      updates[`/passenger_requests/${rideRequest.passengerId}/${rideRequest.rideId}`] = {
        rideId: rideRequest.rideId,
        driverId: rideRequest.driverId,
        status: 'waiting_response',
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
    try {
      const database = this.admin.database;
      // Get ride request details
      const rideRequestRef = database.ref(`/ride_requests/${rideId}`);
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
      updates[`/ride_requests/${rideId}/status`] = action === 'accept' ? 'accepted' : 'rejected';
      updates[`/ride_requests/${rideId}/responseTime`] = new Date().toISOString();
      updates[`/driver_requests/${driverId}/${rideId}/status`] = action === 'accept' ? 'accepted' : 'rejected';
      updates[`/passenger_requests/${rideRequest.passengerId}/${rideId}/status`] =
        action === 'accept' ? 'accepted' : 'rejected';

      await database.ref().update(updates);

      if (action === 'accept') {
        // Accept ride - update MongoDB
        await this.acceptRide(rideId, driverId, rideRequest.passengerId);

        // Notify passenger of acceptance
        await this.notifyPassengerRideAccepted(rideRequest);
      } else {
        // Reject ride - update MongoDB and notify passenger
        await this.rejectRide(rideId, driverId);
        await this.notifyPassengerRideRejected(rideRequest);
      }

      // Clean up Firebase data
      setTimeout(async () => {
        await this.cleanupFirebaseRideRequest(rideId, rideRequest.passengerId, driverId);
      }, 5000);
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
          status: RideStatus.DRIVER_ASSIGNED,
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
      const rideRequest = snapshot.val();

      if (rideRequest && rideRequest.status === 'pending') {
        // Mark as expired in Firebase
        await rideRequestRef.update({
          status: 'expired',
          expiredAt: new Date().toISOString(),
        });

        // Update MongoDB
        await this.rideRepository.findOneAndUpdate(
          { _id: new Types.ObjectId(rideId) },
          {
            status: RideStatus.REJECTED_BY_DRIVER,
            cancelledAt: new Date(),
            cancelReason: 'Driver did not respond in time',
          },
        );

        // Notify passenger
        await this.notifyPassengerRideExpired(rideRequest);

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
      updates[`/ride_requests/${rideId}`] = null;
      updates[`/driver_requests/${driverId}/${rideId}`] = null;
      updates[`/passenger_requests/${passengerId}/${rideId}`] = null;

      await database.ref().update(updates);
      this.logger.log(`Cleaned up Firebase data for ride ${rideId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup Firebase data: ${error.message}`);
    }
  }

  /**
   * Get pending ride requests for a driver
   */
  async getDriverPendingRequests(driverId: string): Promise<any[]> {
    try {
      const database = this.admin.database;

      const snapshot = await database.ref(`/driver_requests/${driverId}`).once('value');
      const requests = snapshot.val() || {};

      return Object.keys(requests).map((rideId) => ({
        rideId,
        ...requests[rideId],
      }));
    } catch (error) {
      this.logger.error(`Failed to get driver pending requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Get passenger ride status
   */
  async getPassengerRideStatus(passengerId: string, rideId: string): Promise<any> {
    try {
      const database = this.admin.database;

      const snapshot = await database.ref(`/passenger_requests/${passengerId}/${rideId}`).once('value');
      return snapshot.val();
    } catch (error) {
      this.logger.error(`Failed to get passenger ride status: ${error.message}`);
      return null;
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
      const database = this.admin.database;

      await database.ref(`/driver_responses/${driverId}`).push({
        rideId,
        driverId,
        action,
        responseTime: new Date().toISOString(),
      });

      // Also handle the response
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

      await database.ref(`/passenger_notifications/${passengerId}`).remove();
    } catch (error) {
      this.logger.error(`Failed to clear passenger notifications: ${error.message}`);
    }
  }
}
