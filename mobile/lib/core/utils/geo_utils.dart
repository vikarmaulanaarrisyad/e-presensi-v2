import 'package:geolocator/geolocator.dart';

class GeofenceValidationResult {
  final bool isInside;
  final double distanceInMeters;
  final double allowedRadiusMeters;
  final double excessDistanceMeters;
  final String statusMessage;

  const GeofenceValidationResult({
    required this.isInside,
    required this.distanceInMeters,
    required this.allowedRadiusMeters,
    required this.excessDistanceMeters,
    required this.statusMessage,
  });

  @override
  String toString() {
    return 'GeofenceValidationResult(isInside: $isInside, distance: ${distanceInMeters.toStringAsFixed(1)}m, radius: ${allowedRadiusMeters}m)';
  }
}

class GeoUtils {
  /// Calculates distance using the WGS84 ellipsoid algorithm via Geolocator
  /// and checks whether the teacher is within the Madrasah's perimeter.
  static GeofenceValidationResult validateGeofence({
    required double currentLatitude,
    required double currentLongitude,
    required double madrasahLatitude,
    required double madrasahLongitude,
    required double radiusMeters,
  }) {
    // 1. Calculate distance between coordinates in meters
    final double rawDistance = Geolocator.distanceBetween(
      currentLatitude,
      currentLongitude,
      madrasahLatitude,
      madrasahLongitude,
    );

    // Round to 1 decimal place (e.g. 18.5 m)
    final double distanceInMeters = double.parse(rawDistance.toStringAsFixed(1));
    final bool isInside = distanceInMeters <= radiusMeters;
    final double excessDistance = isInside ? 0.0 : double.parse((distanceInMeters - radiusMeters).toStringAsFixed(1));

    // 2. Generate informative Indonesian status message
    final String statusMessage = isInside
        ? "Lokasi Valid: Anda berada di dalam area madrasah (${distanceInMeters}m dari titik pusat, radius maks: ${radiusMeters}m)."
        : "Di Luar Radius: Anda berjarak ${distanceInMeters}m dari madrasah. Anda berada ${excessDistance}m di luar radius yang diizinkan (${radiusMeters}m).";

    return GeofenceValidationResult(
      isInside: isInside,
      distanceInMeters: distanceInMeters,
      allowedRadiusMeters: radiusMeters,
      excessDistanceMeters: excessDistance,
      statusMessage: statusMessage,
    );
  }

  /// Verifies GPS hardware status and requests location runtime permissions.
  /// Throws an exception or returns false if permission/GPS is denied.
  static Future<bool> checkAndRequestPermission() async {
    // 1. Check if device location service (GPS) is turned ON
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceDisabledException();
    }

    // 2. Check current location permission status
    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // User permanently denied permissions; guide them to App Settings
      return false;
    }

    return true;
  }

  /// Obtains the current high-accuracy GPS position of the device
  static Future<Position> getCurrentPosition({
    Duration timeLimit = const Duration(seconds: 10),
  }) async {
    final hasPermission = await checkAndRequestPermission();
    if (!hasPermission) {
      throw Exception("Izin akses lokasi GPS ditolak oleh pengguna.");
    }

    return await Geolocator.getCurrentPosition(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: timeLimit,
        forceLocationManager: true,
      ),
    );
  }
}
