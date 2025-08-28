export enum Role {
  PASSENGER = 1,
  DRIVER = 2,
  ADMIN = 3,
}

export enum UserRolesEnum {
  ADMIN = 3,
  PASSENGER = 1,
  DRIVER = 2,
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum RideStatus {
  SEARCHING_DRIVER = 'searching_driver',
  SCHEDULED = 'scheduled',
  PENDING_DRIVER_ACCEPTANCE = 'pending_driver_acceptance',
  DRIVER_ASSIGNED = 'driver_assigned',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED_BY_DRIVER = 'rejected_by_driver',
}

export enum BookingType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum RideType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  QR_CODE = 'qr_code',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum IssueType {
  DRIVER_BEHAVIOR = 'driver_behavior',
  VEHICLE_CONDITION = 'vehicle_condition',
  ROUTE_ISSUE = 'route_issue',
  PAYMENT_ISSUE = 'payment_issue',
  SAFETY_CONCERN = 'safety_concern',
  OTHER = 'other',
}

export enum IssueStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IssuePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SubscriptionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum VehicleStatus {
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum VehicleType {
  SEDAN = 'sedan',
  HATCHBACK = 'hatchback',
  SUV = 'suv',
  MPV = 'mpv',
  TAXI = 'taxi',
}

export enum DocumentType {
  NRIC = 'nric',
  PASSPORT = 'passport',
  PSV_LICENSE = 'psv_license',
  PAMANDU = 'pamandu',
  DRIVING_LICENSE = 'driving_license',
  TAXI_PERMIT_DRIVER = 'taxi_permit_driver',
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  RESUBMITTED = 'resubmitted',
}

export enum VehicleDocumentType {
  CAR_INSURANCE = 'car_insurance',
  CAR_RENTAL_AGREEMENT = 'car_rental_agreement',
  PUSPAKOM_INSPECTION = 'puspakom_inspection',
  TAXI_PERMIT_VEHICLE = 'taxi_permit_vehicle',
  AUTHORIZATION_LETTER = 'authorization_letter',
}

export enum VehicleDocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  RESUBMITTED = 'resubmitted',
}

export enum LicenseClass {
  A = 'A',
  A1 = 'A1',
  B = 'B',
  B1 = 'B1',
  B2 = 'B2',
  C = 'C',
  D = 'D',
  E = 'E',
  GDL = 'GDL',
  PSV = 'PSV',
}

export enum LicenseType {
  COMPETENT = 'competent',
  PROBATIONARY = 'probationary',
  PROVISIONAL = 'provisional',
}

export enum PolicyType {
  COMPREHENSIVE = 'comprehensive',
  THIRD_PARTY = 'third_party',
  THIRD_PARTY_FIRE_THEFT = 'third_party_fire_theft',
}

export enum NotificationType {
  RIDE_REQUEST = 'ride_request',
  RIDE_ACCEPTED = 'ride_accepted',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  RIDE_CANCELLED = 'ride_cancelled',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  DOCUMENT_VERIFIED = 'document_verified',
  DOCUMENT_REJECTED = 'document_rejected',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  ISSUE_REPORTED = 'issue_reported',
  ISSUE_RESOLVED = 'issue_resolved',
  EMERGENCY_CONTACT_NOTIFIED = 'emergency_contact_notified',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum EarningsType {
  RIDE_FARE = 'ride_fare',
  TIP = 'tip',
  BONUS = 'bonus',
  PENALTY = 'penalty',
  SUBSCRIPTION_FEE = 'subscription_fee',
}

export enum EarningsStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  DISPUTED = 'disputed',
}

export enum EmergencyContactRelationship {
  FAMILY = 'family',
  FRIEND = 'friend',
  COLLEAGUE = 'colleague',
  SPOUSE = 'spouse',
  PARENT = 'parent',
  SIBLING = 'sibling',
  OTHER = 'other',
}

export enum RatingCategory {
  OVERALL = 'overall',
  PUNCTUALITY = 'punctuality',
  VEHICLE_CONDITION = 'vehicle_condition',
  DRIVING_SKILL = 'driving_skill',
  COMMUNICATION = 'communication',
  SAFETY = 'safety',
}

export enum Citizenship {
  MALAYSIAN = 'malaysian',
  PERMANENT_RESIDENT = 'permanent_resident',
  FOREIGN = 'foreign',
}

export enum DriverOnlineStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  ON_BREAK = 'on_break',
}

export enum RideRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum PaymentConfirmationStatus {
  PENDING = 'pending',
  PASSENGER_CONFIRMED = 'passenger_confirmed',
  DRIVER_CONFIRMED = 'driver_confirmed',
  BOTH_CONFIRMED = 'both_confirmed',
  DISPUTED = 'disputed',
}
