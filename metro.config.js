const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// babel/lucideIcons.js imports single icon files, which the package's
// `exports` map does not list. Resolve them straight from disk.
const LUCIDE_DIST = 'lucide-react-native/dist/';
const lucideRoot = path.resolve(path.dirname(require.resolve('lucide-react-native')), '../..');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(LUCIDE_DIST)) {
    return { type: 'sourceFile', filePath: path.join(lucideRoot, 'dist', moduleName.slice(LUCIDE_DIST.length)) };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
