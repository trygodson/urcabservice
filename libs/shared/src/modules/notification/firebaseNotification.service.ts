import { Injectable, Logger } from '@nestjs/common';
import { RideStatus } from '@urcab-workspace/shared/enums';
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
    // console.log(notificationData, 'notificationData');
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
    reason?: string,
  ): Promise<boolean> {
    try {
      let title = '';
      let body = '';

      switch (status) {
        case RideStatus.DRIVER_ACCEPTED:
          title = '✅ Driver Accepted';
          body = `${driverInfo?.fullName} is on the way to pick you up`;
          break;
        case RideStatus.DRIVER_AT_PICKUPLOCATION:
          title = '📍 Driver Arrived';
          body = `${driverInfo?.fullName} has arrived at pickup location ${updatedRide?.pickupLocation?.address ?? ''}`;
          break;
        case RideStatus.DRIVER_HAS_PICKUP_PASSENGER:
          title = '📍 Driver Picked Up Passenger';
          body = `${driverInfo?.fullName} has picked up the passenger`;
          break;
        case RideStatus.RIDE_STARTED:
          title = '🚗 Ride Started';
          body = 'Your ride has started. Enjoy your trip!';
          break;
        case RideStatus.RIDE_REACHED_DESTINATION:
          title = '🚗 Ride Reached Destination';
          body = `You have reached your destination ${
            updatedRide?.dropoffLocation?.address ?? ''
          }. Thank you for using UrCab!`;
          break;
        case RideStatus.RIDE_COMPLETED:
          title = '🎉 Ride Completed';
          body = 'Your ride has been completed. Thank you for using UrCab!';
          break;
        case RideStatus.REJECTED_BY_DRIVER:
          title = '🎉 Ride Rejected';
          body = 'Driver cancelled or rejected ride request, Thank you for using UrCab!';
          break;
        case RideStatus.RIDE_CANCELLED:
          title = '🎉 Ride Rejected';
          body = reason ?? 'Driver cancelled or rejected ride request, Thank you for using UrCab!';
          break;
        case 'PAYMENT_COMPLETED':
          title = '💳 Payment Completed';
          body = 'Your ride payment has been successfully completed. Thank you for using UrCab!';
          break;
        default:
          title = 'Ride Update';
          body = `Your ride status: ${status}`;
      }
      // console.log(
      //   {
      //     ...updatedRide,
      //     rideId,
      //     driverInfo: driverInfo
      //       ? {
      //           driverId: driverInfo.id,
      //           driverName: driverInfo?.fullName
      //             ? driverInfo?.fullName
      //             : `${driverInfo.firstName} ${driverInfo.lastName}`,
      //           driverPhone: driverInfo.phone,
      //           driverPhoto: driverInfo.photo || '',
      //           driverRating: driverInfo.rating || 0,
      //           driverVehicle: driverInfo.vehicle || null,
      //           currentLocation: driverInfo?.currentLocation || null,
      //         }
      //       : null,
      //   },
      //   '=====notificationData====',
      // );
      const message: admin.messaging.Message = {
        token: passengerFCMToken,
        notification: { title, body },
        data: {
          type: 'ride_status_update',
          data: JSON.stringify({
            ...updatedRide,
            rideId,
            driverInfo: driverInfo
              ? {
                  driverId: driverInfo.id,
                  driverName: driverInfo?.fullName
                    ? driverInfo?.fullName
                    : `${driverInfo.firstName} ${driverInfo.lastName}`,
                  driverPhone: driverInfo.phone,
                  driverPhoto: driverInfo.photo || '',
                  driverRating: driverInfo.rating || 0,
                  driverVehicle: driverInfo.vehicle || null,
                  currentLocation: driverInfo?.currentLocation || null,
                  vehicleEvp: driverInfo?.vehicleEvp || null,
                }
              : null,
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
