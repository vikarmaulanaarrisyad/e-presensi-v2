import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  static const String _tokenKey = 'auth_token';

  AuthInterceptor({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // 1. Retrieve the saved JWT token from secure storage
    final token = await _storage.read(key: _tokenKey);

    // 2. Attach Authorization Bearer token if present
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    // 3. Set standard enterprise headers
    options.headers['Accept'] = 'application/json';
    options.headers['Content-Type'] = 'application/json';

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // 1. Handle Token Expiry / 401 Unauthorized
    if (err.response?.statusCode == 401) {
      // Clear expired credentials
      await _storage.delete(key: _tokenKey);

      // You can broadcast a stream event or notify your AuthBloc to redirect to LoginScreen
      // e.g., getIt<AuthEventBus>().fire(SessionExpiredEvent());
    }

    // 2. Wrap network exceptions with clear user-friendly messages
    final customException = _handleDioError(err);
    return handler.next(customException);
  }

  DioException _handleDioError(DioException error) {
    String message = "Terjadi kesalahan pada sistem.";

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message = "Koneksi ke server waktu habis (timeout). Silakan periksa jaringan internet Anda.";
        break;
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final responseData = error.response?.data;

        if (responseData is Map<String, dynamic> && responseData.containsKey('error')) {
          message = responseData['error'];
        } else if (statusCode == 401) {
          message = "Sesi login telah berakhir. Silakan masuk kembali.";
        } else if (statusCode == 403) {
          message = "Anda tidak memiliki izin untuk mengakses layanan ini.";
        } else if (statusCode == 404) {
          message = "Layanan atau data yang diminta tidak ditemukan di server.";
        } else if (statusCode != null && statusCode >= 500) {
          message = "Server presensi sedang mengalami gangguan teknis ($statusCode).";
        }
        break;
      case DioExceptionType.connectionError:
        message = "Tidak dapat terhubung ke server. Pastikan perangkat Anda terhubung ke internet.";
        break;
      case DioExceptionType.cancel:
        message = "Permintaan data dibatalkan.";
        break;
      default:
        if (error.error is SocketException) {
          message = "Koneksi internet terputus. Silakan periksa koneksi data atau Wi-Fi Anda.";
        }
        break;
    }

    return DioException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      error: message,
      message: message,
    );
  }
}
