const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const sharedRoot = path.resolve(__dirname, '../../packages/shared');
const config = getDefaultConfig(__dirname);

// @heartwood/shared is consumed as TS source from the monorepo.
config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@heartwood/shared': path.join(sharedRoot, 'src'),
  // shared imports zod; resolve it from this app's own node_modules (the app is not a yarn workspace).
  zod: path.resolve(__dirname, 'node_modules/zod'),
};
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@heartwood/shared') {
    return { type: 'sourceFile', filePath: path.join(sharedRoot, 'src/index.ts') };
  }
  // Files under packages/shared must find deps in this app's node_modules.
  if (moduleName === 'zod') {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(__dirname, 'package.json') },
      moduleName,
      platform
    );
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
