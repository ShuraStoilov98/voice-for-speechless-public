module.exports = ({ config }) => {
  const bundleIdentifier = process.env.APP_BUNDLE_IDENTIFIER;
  const androidPackage = process.env.APP_ANDROID_PACKAGE;
  const projectId = process.env.EAS_PROJECT_ID;
  const owner = process.env.EAS_OWNER;
  if (process.env.EAS_BUILD && (!projectId || !bundleIdentifier || !androidPackage)) {
    throw new Error('Set your own EAS_PROJECT_ID, APP_BUNDLE_IDENTIFIER and APP_ANDROID_PACKAGE before distribution.');
  }
  return {
    ...config,
    ...(owner ? { owner } : {}),
    ios: { ...config.ios, ...(bundleIdentifier ? { bundleIdentifier } : {}) },
    android: { ...config.android, ...(androidPackage ? { package: androidPackage } : {}) },
    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? '',
      defaultLocale: process.env.EXPO_PUBLIC_DEFAULT_LOCALE === 'bg' ? 'bg' : 'en',
      ...(projectId ? { eas: { projectId } } : {})
    }
  };
};
