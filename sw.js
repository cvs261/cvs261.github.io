importScripts('sw-toolbox.js');

toolbox.precache([
  'normalize.css',
  'styles.css',
  'BluetoothConnection.js',
  'companion.js',
  'main.js',
  'index.html',
]);

toolbox.router.default = toolbox.networkFirst;
toolbox.options.networkTimeoutSeconds = 5;

toolbox.router.get('icons/*', toolbox.fastest);
