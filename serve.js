const path = require('path');
const http = require('http');

// eslint-disable-next-line node/no-extraneous-require
const httpProxy = require('http-proxy');
const handler = require('serve-handler');

const proxy = httpProxy.createProxyServer();

const PROXIES = require('./ng-serve-proxy.conf');

const PROXY_SOURCES = Object.keys(PROXIES);

const server = http.createServer((request, response) => {
  const proxySource = PROXY_SOURCES.find(source => request.url.match(source));

  if (proxySource) {
    const proxyConfig = PROXIES[proxySource];
    return proxy.web(request, response, proxyConfig, error => {
      response.destroy(error);
      console.dir({
        source: request.url,
        target: proxyConfig.target,
        message: error.message,
      });
    });
  }

  return handler(request, response, {
    public: path.resolve('dist/static'),
  });
});

// eslint-disable-next-line no-magic-numbers
server.listen(4200, () =>
  console.log('Running with production mode at http://localhost:4200'),
);
