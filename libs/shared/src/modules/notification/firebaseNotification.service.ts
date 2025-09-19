import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Types } from 'mongoose';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

export interface RideNotificationData {
  rideId: string;
  passengerId: string;
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
  distanceToPickup: number;
  estimatedArrivalTime: number;
}

@Injectable()
export class FirebaseNotificationService {
  private readonly logger = new Logger(FirebaseNotificationService.name);

  constructor(@InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin) {
    // Initialize Firebase Admin SDK if not already initialized
  }

  async sendRideRequestToDriver(
    driverFCMToken: string,
    driverId: Types.ObjectId,
    notificationData: RideNotificationData,
  ): Promise<boolean> {
    console.log(notificationData, 'notificationData');
    try {
      const message: admin.messaging.Message = {
        token: driverFCMToken,
        notification: {
          title: '🚗 New Ride Request',
          body: `Pickup: ${notificationData.pickupLocation.address ?? ''} `,
        },
        data: {
          type: 'ride_request',
          data: JSON.stringify(notificationData),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'ride_requests',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
          ttl: 30000, // 30 seconds
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: '🚗 New Ride Request',
                body: `Pickup: ${notificationData.pickupLocation.address ?? ''}`,
              },
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
          headers: {
            'apns-priority': '10',
            'apns-expiration': (Math.floor(Date.now() / 1000) + 30).toString(),
          },
        },
      };

      await this.firebase.messaging.send(message);
      // this.logger.log(`Ride request notification sent to driver ${driverId}: ${response ?? ''}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ride request notification to driver ${driverId}`, error.stack);
      return false;
    }
  }

  async sendRideStatusUpdate(
    passengerFCMToken: string,
    status: string,
    rideId: string,
    driverInfo?: any,
    updatedRide?: any,
  ): Promise<boolean> {
    try {
      let title = '';
      let body = '';

      switch (status) {
        case 'DRIVER_ASSIGNED':
          title = '✅ Driver Assigned';
          body = `${driverInfo?.firstName} is on the way to pick you up`;
          break;
        case 'DRIVER_ARRIVED':
          title = '📍 Driver Arrived';
          body = `${driverInfo?.firstName} has arrived at pickup location`;
          break;
        case 'STARTED':
          title = '🚗 Ride Started';
          body = 'Your ride has started. Enjoy your trip!';
          break;
        case 'COMPLETED':
          title = '🎉 Ride Completed';
          body = 'You have reached your destination. Thank you for using UrCab!';
          break;
        default:
          title = 'Ride Update';
          body = `Your ride status: ${status}`;
      }

      const message: admin.messaging.Message = {
        token: passengerFCMToken,
        notification: { title, body },
        data: {
          type: 'ride_status_update',
          data: JSON.stringify({
            ...updatedRide,
            rideId,
            driverInfo: {
              driverName: `${driverInfo.firstName} ${driverInfo.lastName}`,
              driverPhone: driverInfo.phone,
              driverPhoto: driverInfo.photo || '',
            },
          }),
          // timestamp: new Date().toISOString(),
        },
      };

      const response = await this.firebase.messaging.send(message);
      this.logger.log(`Ride status notification sent: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ride status notification`, error.stack);
      return false;
    }
  }
}
