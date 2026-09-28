Act as an Expert Senior Flutter Developer and Mobile Architect. 

I want to build the mobile app application for "E-Presensi Guru Madrasah", connecting to a Next.js REST API. 

### 1. TECH STACK & LIBRARIES
- Framework: Flutter (latest stable).
- State Management: BLoC (or BLoC, choose the most robust for enterprise).
- Networking: Dio (with interceptors for JWT token handling).
- Location & Geofencing: `geolocator` and `google_maps_flutter`.
- Camera: `camera` or `image_picker` for selfie proof.
- Local Storage: `flutter_secure_storage` for storing auth tokens and user session.

### 2. APP FLOW & FEATURES (GURU ROLE)
- Authentication: Login using NIK/NIP and password provided by Admin Madrasah.
- Home Dashboard: Shows current time, today's attendance status (Clocked In/Out), and a mini-map showing their current location vs Madrasah location.
- Clock-In/Out Flow: 
  1. Validates if GPS is active and within the Madrasah's Geofence radius.
  2. Opens the front camera for a live selfie.
  3. Submits Lat, Lng, Timestamp, and Photo to the backend API.
- History: A list/calendar view of past attendance records.

### 3. ARCHITECTURE (FEATURE-DRIVEN)
Implement Clean Architecture or Feature-First architecture:
/lib
  /core
    /network       # Dio setup, Interceptors
    /utils         # Geolocation helper, Date formatters
  /features
    /auth          # Login UI, Controller, Repository
    /attendance    # Clock-in UI, Camera logic, API calls
    /history       # History UI

### 4. INITIALIZATION TASK
Do not write the whole app at once. Provide:
1. The `pubspec.yaml` dependencies.
2. The exact folder structure representation.
3. The core `Dio` network service setup with a JWT interceptor.
4. The Geolocation utility function that calculates the distance between the user's current coordinate and the Madrasah's coordinate (Geofence validation) before allowing the API call.