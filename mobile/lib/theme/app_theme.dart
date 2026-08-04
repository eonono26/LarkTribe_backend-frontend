import 'package:flutter/material.dart';

/// Colours mirror the web storefront's design tokens (globals.css):
/// bold black/yellow marketplace look, with a signature colour per
/// department for wayfinding.
class AppColors {
  static const ink = Color(0xFF0B0B0C);
  static const paper = Color(0xFFFFFFFF);
  static const mist = Color(0xFFF4F4F2);
  static const signal = Color(0xFFFFE100); // CTAs, price tags
  static const flag = Color(0xFFE8331F); // sale badges, errors
  static const line = Color(0xFFE3E3E0);

  static const deptWomen = Color(0xFFC6185C);
  static const deptKids = Color(0xFF1E8FCE);
  static const deptBeauty = Color(0xFFB84DFF);
  static const deptMaternity = Color(0xFF2FAE66);
  static const deptHome = Color(0xFFB77A2E);

  static Color departmentColor(String slug) {
    switch (slug) {
      case 'women':
        return deptWomen;
      case 'kids':
        return deptKids;
      case 'beauty':
        return deptBeauty;
      case 'maternity':
        return deptMaternity;
      case 'home-lifestyle':
        return deptHome;
      default:
        return ink;
    }
  }
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.paper,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.ink,
      primary: AppColors.ink,
      secondary: AppColors.signal,
      error: AppColors.flag,
    ),
    fontFamily: 'Roboto',
    textTheme: const TextTheme(
      headlineLarge: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
      headlineMedium: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
      titleLarge: TextStyle(fontWeight: FontWeight.w800),
      titleMedium: TextStyle(fontWeight: FontWeight.w700),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paper,
      foregroundColor: AppColors.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.ink,
        foregroundColor: AppColors.paper,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.mist,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );
}
