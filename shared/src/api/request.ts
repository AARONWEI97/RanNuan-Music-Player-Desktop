import axios, { type AxiosRequestConfig, type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getStorageAdapter } from '../storageAdapter';

declare const __DEV__: boolean | undefined;

const DEFAULT_API_BASE_URL = 'http://139.9.223.233:3000';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
  noRetry?: boolean;
  silent?: boolean;
}

let apiBaseUrl = DEFAULT_API_BASE_URL;

export const setApiBaseUrl = (url: string) => {
  apiBaseUrl = url;
};

export const getApiBaseUrl = () => apiBaseUrl;

const request = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

const MAX_RETRIES = 1;
const RETRY_DELAY = 500;
export const TOKEN_KEY = 'auth_token';

request.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    config.baseURL = apiBaseUrl || DEFAULT_API_BASE_URL;

    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    config.params = {
      ...config.params,
      timestamp: Date.now(),
      device: 'pc',
    };

    try {
      const adapter = getStorageAdapter();
      const token = await adapter.getItem(TOKEN_KEY);
      if (token && !token.startsWith('uid:')) {
        const cookieWithOs = `${token} os=pc;`;
        if (config.method !== 'post') {
          config.params.cookie = config.params.cookie !== undefined ? config.params.cookie : cookieWithOs;
        } else if (config.method === 'post') {
          config.data = {
            ...config.data,
            cookie: cookieWithOs,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to read auth token:', e);
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`,
        config.data ? `body=${JSON.stringify(config.data).substring(0, 200)}` : '');
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[Response] ${response.config.url} status=${response.status} code=${response.data?.code}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;

    const isUpstreamError = error.response?.status === 502 || config?.silent;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const logFn = isUpstreamError ? console.warn : console.error;
      const prefix = config?.silent ? '[Silent]' : isUpstreamError ? '[Upstream 502]' : '[Response Error]';
      logFn(
        `${prefix} ${config?.url}`,
        `status=${error.response?.status}`,
        `message=${error.message}`
      );
    }

    if (!config) {
      return Promise.reject(error);
    }

    if ((error.response?.status === 401 || error.response?.status === 403) && config.params?.noLogin !== true) {
      try {
        const adapter = getStorageAdapter();
        await adapter.removeItem(TOKEN_KEY);
      } catch {}
      config.retryCount = 3;
    }

    if (
      config.retryCount !== undefined &&
      config.retryCount < MAX_RETRIES &&
      !config.noRetry
    ) {
      config.retryCount++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return request(config);
    }

    return Promise.reject(error);
  }
);

export default request;
