const getRoutes = (stack, basePath = '') => {
  const routes = [];

  stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((method) =>
        method.toUpperCase()
      );

      routes.push({
        methods,
        path: `${basePath}${layer.route.path}`,
      });

      return;
    }

    if (layer.name === 'router' && layer.handle.stack) {
      const path = getLayerPath(layer);
      routes.push(...getRoutes(layer.handle.stack, `${basePath}${path}`));
    }
  });

  return routes;
};

const getLayerPath = (layer) => {
  if (!layer.regexp || !layer.regexp.source) {
    return '';
  }

  const match = layer.regexp.source
    .replace('\\/?(?=\\/|$)', '')
    .replace('^', '')
    .replace('\\/?$', '')
    .match(/\\\/([^\\]+(?:\\\/[^\\]+)*)/);

  if (!match) {
    return '';
  }

  return `/${match[1].replace(/\\\//g, '/')}`;
};

const printRoutes = (app) => {
  const routes = getRoutes(app._router.stack);

  if (!routes.length) {
    console.log('No routes registered');
    return;
  }

  console.log('Registered Routes:');
  routes.forEach((route) => {
    console.log(`${route.methods.join(', ').padEnd(12)} ${route.path}`);
  });
};

module.exports = {
  printRoutes,
};
