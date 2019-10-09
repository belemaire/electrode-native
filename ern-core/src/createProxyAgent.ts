import config from './config'
import http from 'http'
import tunnel from 'tunnel'
import url from 'url'

export function createProxyAgentFromUrl(proxyUrl: url.URL): http.Agent {
  const supportedProtocols = ['http', 'https']
  if (!supportedProtocols.includes(proxyUrl.protocol)) {
    throw new Error('Only http and https protocols are supported')
  }
  const proxy = {
    host: proxyUrl.host,
    port: parseInt(proxyUrl.port, 10),
  }

  return proxyUrl.protocol === 'http'
    ? tunnel.httpOverHttp({ proxy })
    : tunnel.httpOverHttps({ proxy })
}

export function createProxyAgentFromErnConfig(
  configKey: string
): http.Agent | undefined {
  const proxyUrl = config.getValue(configKey)
  if (proxyUrl) {
    return createProxyAgentFromUrl(proxyUrl)
  }
}
