import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'auth_interceptor.dart';

class DioClient {
  late final Dio _dio;

  // Default Base URL: 
  // - For Android Emulator use: http://10.0.2.2:3000
  // - For Physical Device use your local IP: http://192.168.1.X:3000
  // - For Production use: https://presensi.kemenag.go.id
  static const String defaultBaseUrl = 'http://10.0.2.2:3000';

  DioClient({String? baseUrl, AuthInterceptor? authInterceptor}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 20),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    // 1. Add Authentication JWT Interceptor
    _dio.interceptors.add(authInterceptor ?? AuthInterceptor());

    // 2. Add Pretty Logger in Debug Mode
    if (kDebugMode) {
      _dio.interceptors.add(
        PrettyDioLogger(
          requestHeader: true,
          requestBody: true,
          responseBody: true,
          responseHeader: false,
          error: true,
          compact: true,
          maxWidth: 90,
        ),
      );
    }
  }

  Dio get dio => _dio;

  // GET Request
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  // POST Request
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    return await _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  // POST Multipart / Form Data (For uploading selfie photo proof)
  Future<Response> postMultipart(
    String path, {
    required FormData formData,
    Map<String, dynamic>? queryParameters,
    ProgressCallback? onSendProgress,
    CancelToken? cancelToken,
  }) async {
    return await _dio.post(
      path,
      data: formData,
      queryParameters: queryParameters,
      onSendProgress: onSendProgress,
      cancelToken: cancelToken,
      options: Options(
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      ),
    );
  }
}
