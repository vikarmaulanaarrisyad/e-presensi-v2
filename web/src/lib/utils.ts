import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for combining Tailwind CSS class names with clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceValidationResult {
  isWithinRadius: boolean;
  distanceInMeters: number;
  maxRadiusMeters: number;
}

/**
 * Earth radius constant in meters (WGS84 mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param coord1 First coordinate (user position)
 * @param coord2 Second coordinate (target madrasah center)
 * @returns Distance in meters (rounded to 2 decimal places)
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Validates whether a user's location falls within the allowed Geofence radius of a Madrasah.
 *
 * @param userCoords Latitude and Longitude of the user (e.g. from Mobile GPS)
 * @param centerCoords Latitude and Longitude of the Madrasah's registered location
 * @param radiusMeters Maximum allowed distance radius in meters
 */
export function validateGeofence(
  userCoords: Coordinates,
  centerCoords: Coordinates,
  radiusMeters: number
): GeofenceValidationResult {
  const distance = calculateHaversineDistance(userCoords, centerCoords);

  return {
    isWithinRadius: distance <= radiusMeters,
    distanceInMeters: distance,
    maxRadiusMeters: radiusMeters,
  };
}
