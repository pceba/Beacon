// Rewrites `import { Sun, Plus as Add } from 'lucide-react-native'` into one
// import per icon file, so the bundle only carries the icons the app uses
// instead of the whole barrel (~1,650 icons). Names that are not icons
// (createLucideIcon, Icon, types) stay on the barrel import.
const fs = require('fs');
const path = require('path');

const PKG = 'lucide-react-native';
const ICON_DIR = `${PKG}/dist/esm/icons/`;

function readIconMap() {
  // require.resolve gives dist/cjs/lucide-react-native.js (package.json is not exported).
  const root = path.resolve(path.dirname(require.resolve(PKG)), '../..');
  const barrel = path.join(root, 'dist/esm/lucide-react-native.js');
  const map = new Map();
  const line = /export \{([^}]+)\} from '\.\/icons\/([a-z0-9-]+)\.js';/g;
  const source = fs.readFileSync(barrel, 'utf8');
  for (let m = line.exec(source); m; m = line.exec(source)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^default as /, '');
      if (name) map.set(name, m[2]);
    }
  }
  return map;
}

module.exports = function lucideIcons({ types: t }) {
  const icons = readIconMap();
  return {
    name: 'lucide-icons',
    visitor: {
      ImportDeclaration(p) {
        const node = p.node;
        if (node.source.value !== PKG || node.importKind === 'type') return;
        const keep = [];
        const direct = [];
        for (const spec of node.specifiers) {
          const imported = spec.type === 'ImportSpecifier' && spec.importKind !== 'type'
            ? (spec.imported.name ?? spec.imported.value)
            : null;
          const file = imported ? icons.get(imported) : undefined;
          if (file) {
            direct.push(t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(spec.local.name))],
              t.stringLiteral(`${ICON_DIR}${file}.js`),
            ));
          } else {
            keep.push(spec);
          }
        }
        if (direct.length === 0) return;
        if (keep.length > 0) {
          node.specifiers = keep;
          p.insertAfter(direct);
        } else {
          p.replaceWithMultiple(direct);
        }
      },
    },
  };
};
