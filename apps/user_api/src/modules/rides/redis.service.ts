// services/redis.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type Redis as RedisType } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisType; // For regular operations
  private subscriber: RedisType; // Only for subscribing
  private publisher: RedisType;
  constructor(
    private configService: ConfigService, // @InjectRedis() private readonly publisher: RedisType, // @InjectRedis() private readonly subscriber: RedisType, // @InjectRedis() private readonly client: RedisType,
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      // password: this.configService.get('redis.password'),
      // db: this.configService.get('REDIS_NAME'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });
  }

  // Store ride request
  async storeRideRequest(rideId: string, rideData: any, ttl: number = 300): Promise<void> {
    await this.client.setex(`ride_request:${rideId}`, ttl, JSON.stringify(rideData));
  }

  // Get ride request
  async getRideRequest(rideId: string): Promise<any | null> {
    const data = await this.client.get(`ride_request:${rideId}`);
    return data ? JSON.parse(data) : null;
  }

  // Delete ride request
  async deleteRideRequest(rideId: string): Promise<void> {
    await this.client.del(`ride_request:${rideId}`);
  }

  async storeDriverLocation(driverId: string, locationData: any, ttl: number = 300): Promise<void> {
    try {
      await this.client.setex(`driver_location:${driverId}`, ttl, JSON.stringify(locationData));

      // Also store in a geo-index for proximity searches
      await this.client.geoadd(
        'driver_locations_geo',
        locationData.location.coordinates[0], // longitude
        locationData.location.coordinates[1], // latitude
        driverId,
      );

      // Set TTL for geo data
      await this.client.expire('driver_locations_geo', ttl);
    } catch (error) {
      this.logger.error('Failed to store driver location:', error);
      throw error;
    }
  }

  // Get driver location from Redis
  async getDriverLocation(driverId: string): Promise<any | null> {
    try {
      const data = await this.client.get(`driver_location:${driverId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Failed to get driver location:', error);
      return null;
    }
  }

  // Store driver pending requests
  async addDriverPendingRequest(driverId: string, rideId: string, ttl: number = 300): Promise<void> {
    await this.client.setex(`driver_pending:${driverId}:${rideId}`, ttl, Date.now().toString());
    await this.client.sadd(`driver_requests:${driverId}`, rideId);
    await this.client.expire(`driver_requests:${driverId}`, ttl);
  }

  // Get driver pending requests
  async getDriverPendingRequests(driverId: string): Promise<string[]> {
    return await this.client.smembers(`driver_requests:${driverId}`);
  }

  // Remove driver pending request
  async removeDriverPendingRequest(driverId: string, rideId: string): Promise<void> {
    await this.client.del(`driver_pending:${driverId}:${rideId}`);
    await this.client.srem(`driver_requests:${driverId}`, rideId);
  }

  // Store driver response
  async storeDriverResponse(rideId: string, driverId: string, response: 'accept' | 'reject'): Promise<void> {
    const responseData = {
      driverId,
      response,
      timestamp: Date.now(),
    };
    await this.client.setex(`driver_response:${rideId}`, 60, JSON.stringify(responseData));
  }

  // Get driver response
  async getDriverResponse(rideId: string): Promise<any | null> {
    const data = await this.client.get(`driver_response:${rideId}`);
    return data ? JSON.parse(data) : null;
  }

  // Publish message to channel
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  // Subscribe to channel
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          this.logger.error(`Failed to parse message from channel ${channel}:`, error);
        }
      }
    });
  }

  // Store user socket mapping
  async storeUserSocket(userId: string, socketId: string, userType: 'driver' | 'passenger'): Promise<void> {
    await this.client.setex(`socket:${userType}:${userId}`, 3600, socketId);
  }

  // Get user socket
  async getUserSocket(userId: string, userType: 'driver' | 'passenger'): Promise<string | null> {
    return await this.client.get(`socket:${userType}:${userId}`);
  }

  // Remove user socket
  async removeUserSocket(userId: string, userType: 'driver' | 'passenger'): Promise<void> {
    await this.client.del(`socket:${userType}:${userId}`);
  }

  // Store driver notification queue for a ride
  async storeDriverQueue(rideId: string, driverIds: string[], ttl: number = 600): Promise<void> {
    await this.client.setex(`ride_driver_queue:${rideId}`, ttl, JSON.stringify(driverIds));
  }

  // Get driver queue for a ride
  async getDriverQueue(rideId: string): Promise<string[] | null> {
    const data = await this.client.get(`ride_driver_queue:${rideId}`);
    return data ? JSON.parse(data) : null;
  }

  // Get current driver being notified
  async getCurrentNotifiedDriver(rideId: string): Promise<string | null> {
    return await this.client.get(`ride_current_driver:${rideId}`);
  }

  // Set current driver being notified
  async setCurrentNotifiedDriver(rideId: string, driverId: string, ttl: number = 60): Promise<void> {
    await this.client.setex(`ride_current_driver:${rideId}`, ttl, driverId);
  }

  // Remove current driver and move to next
  async moveToNextDriver(rideId: string): Promise<string | null> {
    const queue = await this.getDriverQueue(rideId);
    if (!queue || queue.length === 0) {
      await this.client.del(`ride_current_driver:${rideId}`);
      return null;
    }

    const nextDriverId = queue.shift();
    await this.storeDriverQueue(rideId, queue);
    if (nextDriverId) {
      await this.setCurrentNotifiedDriver(rideId, nextDriverId);
    } else {
      await this.client.del(`ride_current_driver:${rideId}`);
    }

    return nextDriverId || null;
  }

  // Mark driver as notified (for tracking)
  async markDriverNotified(rideId: string, driverId: string): Promise<void> {
    await this.client.sadd(`ride_notified_drivers:${rideId}`, driverId);
    await this.client.expire(`ride_notified_drivers:${rideId}`, 600);
  }

  // Check if driver was already notified
  async wasDriverNotified(rideId: string, driverId: string): Promise<boolean> {
    return (await this.client.sismember(`ride_notified_drivers:${rideId}`, driverId)) === 1;
  }

  // Clear all driver queue data for a ride
  async clearDriverQueue(rideId: string): Promise<void> {
    await this.client.del(`ride_driver_queue:${rideId}`);
    await this.client.del(`ride_current_driver:${rideId}`);
    await this.client.del(`ride_notified_drivers:${rideId}`);
  }

  // Track driver cancellation for a passenger (exclusion period)
  // Store with TTL matching the exclusion period (default 30 minutes = 1800 seconds)
  async trackDriverCancellation(
    driverId: string,
    passengerId: string,
    exclusionPeriodSeconds: number = 1800,
  ): Promise<void> {
    const key = `driver_cancellation:${driverId}:${passengerId}`;
    await this.client.setex(key, exclusionPeriodSeconds, Date.now().toString());
  }

  // Check if driver is excluded from receiving requests from a passenger
  async isDriverExcluded(driverId: string, passengerId: string): Promise<boolean> {
    const key = `driver_cancellation:${driverId}:${passengerId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // Get exclusion expiry time for a driver-passenger pair
  async getDriverExclusionExpiry(driverId: string, passengerId: string): Promise<number | null> {
    const key = `driver_cancellation:${driverId}:${passengerId}`;
    const ttl = await this.client.ttl(key);
    if (ttl === -2) {
      // Key doesn't exist
      return null;
    }
    if (ttl === -1) {
      // Key exists but has no expiry (shouldn't happen with our implementation)
      return null;
    }
    return Date.now() + ttl * 1000; // Return expiry timestamp
  }

  // Remove exclusion (if needed for admin override)
  async removeDriverExclusion(driverId: string, passengerId: string): Promise<void> {
    const key = `driver_cancellation:${driverId}:${passengerId}`;
    await this.client.del(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }
}
