// gateways/ride.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import * as crypto from 'crypto-js';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis.service';
import { RideWebSocketService } from '../ride-websocket.service';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: 'driver' | 'passenger';
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/rides',
})
@Injectable()
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RideGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,

    private readonly rideWebSocketService: RideWebSocketService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from auth header or query
      const { token, userType } = this.extractTokenFromClient(client);
      const jwt_secret = this.configService.get('JWT_SECRET');
      if (!token) {
        this.logger.warn('Client connected without authentication token');
        client.disconnect();
        return;
      }

      // Verify JWT token

      const payload = this.jwtService.verify(token);

      let bytes = crypto.AES.decrypt(payload['data'], jwt_secret);
      let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

      console.log(decrypted, '====the token', userType, '=====');
      client.userId = decrypted.user_id;
      client.userType = userType;

      // Store socket mapping in Redis
      await this.redisService.storeUserSocket(client.userId, client.id, client.userType);

      // Join user-specific room
      await client.join(`${client.userType}:${client.userId}`);

      this.logger.log(`${client.userType} ${client.userId} connected with socket ${client.id}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to ride service',
        userId: client.userId,
        userType: client.userType,
      });
    } catch (error) {
      this.logger.error('Authentication failed for client:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.userType) {
      await this.redisService.removeUserSocket(client.userId, client.userType);
      this.logger.log(`${client.userType} ${client.userId} disconnected`);
    }
  }

  private extractTokenFromClient(client: Socket): any | null {
    // Try to get token from authorization header
    // const authHeader = client.handshake.headers.authorization;
    // if (authHeader && authHeader.startsWith('Bearer ')) {
    //   return authHeader.substring(7);
    // }

    // Try to get token from query parameters
    const token = client.handshake.query.token;
    const userType = client.handshake.query.userType;
    if (typeof token === 'string') {
      return { token, userType };
    }

    return null;
  }

  @SubscribeMessage('driver_location_update')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      accuracy?: number;
      timestamp?: number;
      rideId: string;
      passenger: Map<string, any>;
      driverId: string;
    },
  ) {
    // console.log(data, '===== location driver with passenger====');
    try {
      if (client.userType !== 'driver') {
        client.emit('error', { message: 'Only drivers can update location' });
        return;
      }

      // Validate location data
      if (!data.latitude || !data.longitude) {
        client.emit('error', { message: 'Latitude and longitude are required' });
        return;
      }

      // Validate coordinates are valid
      if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
        client.emit('error', { message: 'Invalid coordinates provided' });
        return;
      }

      const locationUpdate = {
        driverId: client.userId,
        location: {
          type: 'Point',
          coordinates: [data.longitude, data.latitude],
        },
        // heading: data.heading || null,
        // speed: data.speed || null,
        // accuracy: data.accuracy || null,
        // timestamp: data.timestamp || Date.now(),
        // lastLocationUpdate: new Date(),
      };

      // Update driver location in database and Redis
      await this.rideWebSocketService.updateDriverLocation(client.userId, locationUpdate);

      // console.log(data, '===== location driver with passenger====');
      await this.sendDriverLocationToPassenger(data.passenger['_id'].toString(), {
        rideId: data.rideId.toString(),
        driverId: client.userId.toString(),
        driverLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          // heading: data.heading,
          // speed: data.speed,
          // accuracy: data.accuracy,
          // timestamp: locationUpdate.timestamp,
        },
      });

      // Get driver's current active rides to notify passengers
      // const activeRides = await this.rideWebSocketService.getDriverActiveRides(client.userId);

      // Notify passengers in active rides about driver location
      // for (const ride of activeRides) {

      // }

      // Store location in Redis for quick access (with TTL)
      // await this.redisService.storeDriverLocation(client.userId, locationUpdate, 300); // 5 minutes TTL

      // Confirm location update to driver
      // client.emit('location_updated', {
      //   success: true,
      //   message: 'Location updated successfully',
      //   timestamp: locationUpdate.timestamp,
      //   coordinates: {
      //     latitude: data.latitude,
      //     longitude: data.longitude,
      //   },
      // });
    } catch (error) {
      this.logger.error('Failed to handle driver location update:', error);
      client.emit('error', {
        message: error.message || 'Failed to update location',
        code: 'LOCATION_UPDATE_ERROR',
      });
    }
  }

  // Send driver location to passenger
  async sendDriverLocationToPassenger(passengerId: string, locationData: any) {
    try {
      const passengerSocketId = await this.redisService.getUserSocket(passengerId, 'passenger');

      if (passengerSocketId) {
        this.server.to(passengerSocketId).emit('driver_location_update', {
          success: true,
          type: 'driver_location_update',
          data: locationData,
          timestamp: Date.now(),
        });
        this.logger.log(`Sent driver location update to passenger ${passengerId}`);
        // this.logger.log(JSON.stringify(locationData));
        return true;
      } else {
        this.logger.warn(`Passenger ${passengerId} is not connected via WebSocket`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send driver location to passenger ${passengerId}:`, error);
      return false;
    }
  }

  // Driver accepts/rejects ride request
  @SubscribeMessage('driver_response')
  async handleDriverResponse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rideId: string; action: 'accept' | 'reject'; reason?: string },
  ) {
    try {
      if (client.userType !== 'driver') {
        client.emit('error', { message: 'Only drivers can respond to ride requests' });
        return;
      }

      await this.rideWebSocketService.handleDriverResponse(data.rideId, client.userId, data.action, data.reason);

      client.emit('response_sent', {
        rideId: data.rideId,
        action: data.action,
        message: `Ride ${data.action}ed successfully`,
      });
    } catch (error) {
      this.logger.error('Failed to handle driver response:', error);
      client.emit('error', { message: error.message });
    }
  }

  // Passenger cancels ride request
  @SubscribeMessage('cancel_ride')
  async handleCancelRide(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rideId: string; reason?: string },
  ) {
    try {
      if (client.userType !== 'passenger') {
        client.emit('error', { message: 'Only passengers can cancel rides' });
        return;
      }

      await this.rideWebSocketService.cancelRide(data.rideId, client.userId, data.reason);

      client.emit('ride_cancelled', {
        rideId: data.rideId,
        message: 'Ride cancelled successfully',
      });
    } catch (error) {
      this.logger.error('Failed to cancel ride:', error);
      client.emit('error', { message: error.message });
    }
  }

  // Get pending requests for driver
  @SubscribeMessage('get_pending_requests')
  async handleGetPendingRequests(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.userType !== 'driver') {
        client.emit('error', { message: 'Only drivers can get pending requests' });
        return;
      }

      const pendingRequests = await this.rideWebSocketService.getDriverPendingRequests(client.userId);

      client.emit('pending_requests', {
        requests: pendingRequests,
        count: pendingRequests.length,
      });
    } catch (error) {
      this.logger.error('Failed to get pending requests:', error);
      client.emit('error', { message: error.message });
    }
  }

  // Send ride request to specific driver
  async sendRideRequestToDriver(driverId: string, rideData: any) {
    const driverSocketId = await this.redisService.getUserSocket(driverId, 'driver');

    if (driverSocketId) {
      this.server.to(driverSocketId).emit('ride_request', rideData);
      this.logger.log(`Sent ride request to driver ${driverId}`);
    } else {
      this.logger.warn(`Driver ${driverId} is not connected via WebSocket`);
    }
  }

  // Send status update to passenger
  async sendStatusUpdateToPassenger(passengerId: string, statusData: any) {
    const passengerSocketId = await this.redisService.getUserSocket(passengerId, 'passenger');

    if (passengerSocketId) {
      this.server.to(passengerSocketId).emit('ride_status_update', statusData);
      this.logger.log(`Sent status update to passenger ${passengerId}`);
    } else {
      this.logger.warn(`Passenger ${passengerId} is not connected via WebSocket`);
    }
  }

  // Broadcast to all drivers in a specific area (for general announcements)
  async broadcastToDriversInArea(driverIds: string[], message: any) {
    for (const driverId of driverIds) {
      const socketId = await this.redisService.getUserSocket(driverId, 'driver');
      if (socketId) {
        this.server.to(socketId).emit('area_broadcast', message);
      }
    }
  }
}
