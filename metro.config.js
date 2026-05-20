import { getDefaultConfig } from 'expo/metro-config.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/server\/.*/];

<<<<<<< HEAD
export default config;
=======
// Exclude react-native-maps from web bundling
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { filePath: require.resolve('./web/MapPlaceholder.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
>>>>>>> remotes/gozilethu/farmlink-Mbutho
