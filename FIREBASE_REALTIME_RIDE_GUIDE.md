# Firebase Real-time Ride Booking Implementation Guide

## Overview

This guide explains how to implement a real-time ride booking system using Firebase Realtime Database without Redis, where passengers select drivers and drivers accept/reject requests in real-time.

## Architecture Components

### 1. Firebase Realtime Database Structure

```
/ride_requests/{rideId}
  - rideId: string
  - passengerId: string
  - driverId: string
  - passengerName: string
  - passengerPhone: string
  - pickupLocation: { address, coordinates, landmark }
  - dropoffLocation: { address, coordinates, landmark }
  - estimatedFare: number
  - estimatedDistance: number
  - estimatedDuration: number
  - status: 'pending' | 'accepted' | 'rejected' | 'expired'
  - requestTime: string
  - expiresAt: string
  - responseTime?: string

/driver_requests/{driverId}/{rideId}
  - rideId: string
  - status: 'pending' | 'accepted' | 'rejected'
  - expiresAt: string
  - createdAt: string

/passenger_requests/{passengerId}/{rideId}
  - rideId: string
  - driverId: string
  - status: 'waiting_response' | 'accepted' | 'rejected'
  - createdAt: string

/passenger_notifications/{passengerId}
  - [notifications array with type, rideId, driverId, message, timestamp]

/driver_responses/{driverId}
  - [temporary storage for driver responses]
```

### 2. Backend Services

#### FirebaseRideService (`firebase-ride.service.ts`)

- `sendRideRequestToDriver()` - Store request in Firebase + send FCM notification
- `handleDriverResponse()` - Process accept/reject responses
- `handleRideRequestExpiry()` - Auto-expire after 30 seconds
- `getDriverPendingRequests()` - Get driver's pending requests
- `getPassengerNotifications()` - Get passenger real-time updates

#### Updated RidesService (`rides.service.ts`)

- `bookRide()` - Create ride with `PENDING_DRIVER_ACCEPTANCE` status
- `sendRideRequestToSelectedDriver()` - Use Firebase service for requests

### 3. API Endpoints

#### Firebase Ride Controller (`firebase-ride.controller.ts`)

- `POST /firebase-rides/driver-response/:rideId` - Driver accept/reject
- `GET /firebase-rides/driver-pending-requests` - Get driver requests
- `GET /firebase-rides/passenger-notifications` - Get passenger notifications
- `POST /firebase-rides/passenger-notifications/clear` - Clear notifications
- `GET /firebase-rides/passenger-ride-status/:rideId` - Get ride status

## Implementation Flow

### 1. Passenger Selects Driver Flow

```
1. Passenger views nearby drivers list
2. Passenger selects a specific driver
3. Call POST /rides with selectedDriverId
4. Backend creates ride with PENDING_DRIVER_ACCEPTANCE status
5. FirebaseRideService stores request in Firebase Realtime Database
6. FCM notification sent to selected driver
7. 30-second auto-expiry timer starts
```

### 2. Driver Response Flow

```
1. Driver receives FCM notification with ride request data
2. Driver app loads request details from Firebase
3. Driver calls POST /firebase-rides/driver-response/:rideId with action: 'accept' | 'reject'
4. Backend updates both Firebase and MongoDB
5. Passenger receives real-time notification
6. If accepted: Ride status → DRIVER_ASSIGNED
7. If rejected: Ride status → REJECTED_BY_DRIVER
```

### 3. Real-time Updates

```
Passenger App:
- Listens to /passenger_notifications/{passengerId}
- Gets instant updates on driver responses
- Can select another driver if rejected

Driver App:
- Listens to /driver_requests/{driverId}
- Receives new ride requests
- Can respond with accept/reject
```

## Mobile App Integration

### Passenger App (React Native/Flutter)

```javascript
// Listen for ride status updates
const database = firebase.database();
const notificationsRef = database.ref(`/passenger_notifications/${passengerId}`);

notificationsRef.on('child_added', (snapshot) => {
  const notification = snapshot.val();
  if (notification.type === 'ride_accepted') {
    // Ride accepted - navigate to ride tracking
    navigateToRideTracking(notification.rideId);
  } else if (notification.type === 'ride_rejected') {
    // Driver rejected - show driver selection again
    showDriverSelectionList();
  } else if (notification.type === 'ride_expired') {
    // Request expired - show driver selection again
    showDriverSelectionList();
  }
});

// Book ride with selected driver
const bookRideWithSelectedDriver = async (driverId) => {
  const response = await fetch('/api/rides', {
    method: 'POST',
    body: JSON.stringify({
      ...rideData,
      selectedDriverId: driverId,
    }),
  });
};
```

### Driver App (React Native/Flutter)

```javascript
// Listen for ride requests
const database = firebase.database();
const requestsRef = database.ref(`/driver_requests/${driverId}`);

requestsRef.on('child_added', (snapshot) => {
  const request = snapshot.val();
  if (request.status === 'pending') {
    // Show ride request popup
    showRideRequestPopup(request);
  }
});

// Respond to ride request
const respondToRideRequest = async (rideId, action) => {
  const response = await fetch(`/api/firebase-rides/driver-response/${rideId}`, {
    method: 'POST',
    body: JSON.stringify({ action }), // 'accept' or 'reject'
  });
};
```

## Key Features

### 1. Real-time Communication

- No polling required
- Instant notifications
- Firebase handles connection management

### 2. Request Expiry

- Automatic 30-second timeout
- Prevents stale requests
- Allows passenger to select another driver

### 3. Bidirectional Flow

- Driver can accept/reject
- Passenger gets instant feedback
- Can select different drivers

### 4. Fallback Handling

- If driver doesn't respond → auto-expire
- If FCM fails → fallback to nearby drivers
- Multiple driver selection attempts

## Database Status Flow

```
1. Ride created: PENDING_DRIVER_ACCEPTANCE
2. Driver accepts: DRIVER_ASSIGNED
3. Driver rejects: REJECTED_BY_DRIVER
4. Request expires: REJECTED_BY_DRIVER (with reason)
5. Driver starts trip: STARTED
6. Driver completes: COMPLETED
```

## Deployment Notes

### Firebase Setup

1. Configure Firebase Realtime Database rules
2. Set up FCM for push notifications
3. Enable database indexing for performance

### Security Rules

```javascript
{
  "rules": {
    "ride_requests": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "driver_requests": {
      "$driverId": {
        ".read": "auth.uid == $driverId",
        ".write": "auth.uid == $driverId"
      }
    },
    "passenger_notifications": {
      "$passengerId": {
        ".read": "auth.uid == $passengerId",
        ".write": true
      }
    }
  }
}
```

This implementation provides a complete real-time ride booking system using Firebase without Redis, allowing passengers to select drivers and receive instant responses.
