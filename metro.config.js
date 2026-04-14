import { getDefaultConfig } from 'expo/metro-config.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/server\/.*/];

export default config;