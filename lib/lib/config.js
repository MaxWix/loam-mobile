const DEV = __DEV__;

export const API_URL = DEV
  ? process.env.EXPO_PUBLIC_API_URL_LOCAL
  : process.env.EXPO_PUBLIC_API_URL;
