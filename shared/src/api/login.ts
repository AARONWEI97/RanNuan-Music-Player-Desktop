import request, { type ApiRequestConfig } from './request';

const loginRequestOptions: ApiRequestConfig = {
  noRetry: true,
  skipAuthCookie: true,
};

const preserveAuthRequestOptions: ApiRequestConfig = {
  preserveAuthCookie: true,
};

export function getQrKey() {
  return request.get('/login/qr/key', loginRequestOptions);
}

export function createQr(key: string) {
  return request.get('/login/qr/create', {
    params: { key, qrimg: true },
    ...loginRequestOptions,
  });
}

export function checkQr(key: string, noCookie = false) {
  return request.get('/login/qr/check', {
    params: { key, ...(noCookie ? { noCookie: true } : {}) },
    ...loginRequestOptions,
  });
}

export function loginByCellphone(phone: string, password: string) {
  return request.post('/login/cellphone', { phone, password, randomCNIP: true }, loginRequestOptions);
}

export function loginByCaptcha(phone: string, captcha: string) {
  return request.post('/login/cellphone', { phone, captcha, randomCNIP: true }, loginRequestOptions);
}

export function loginByEmail(email: string, password: string) {
  return request.post('/login', { email, password, randomCNIP: true }, loginRequestOptions);
}

export function loginByUid(uid: string | number) {
  return request.get('/user/detail', {
    params: { uid }
  });
}

export function registerAnonymous() {
  return request.get('/register/anonimous', {
    params: { randomCNIP: true },
    ...loginRequestOptions,
  });
}

export function refreshLogin(cookie?: string) {
  const config: ApiRequestConfig = {
    params: { randomCNIP: true, ...(cookie ? { cookie } : {}) },
    noRetry: true,
    ...(cookie ? { skipAuthCookie: true } : {}),
  };
  return request.get('/login/refresh', config);
}

function sendCaptchaRequest(path: '/captcha/sent/v1' | '/captcha/sent', phone: string, ctcode?: string) {
  return request.get(path, {
    params: { phone, ctcode: ctcode || '86', randomCNIP: true },
    ...loginRequestOptions,
  });
}

export async function sendCaptcha(phone: string, ctcode?: string) {
  try {
    return await sendCaptchaRequest('/captcha/sent/v1', phone, ctcode);
  } catch (error: unknown) {
    const response = (error as { response?: { status?: number; data?: { code?: number } } }).response;
    const status = response?.status;
    const code = response?.data?.code;
    if (status !== 404 && status !== 405 && code !== 404) throw error;
    return sendCaptchaRequest('/captcha/sent', phone, ctcode);
  }
}

export function verifyCaptcha(phone: string, captcha: string, ctcode?: string) {
  return request.get('/captcha/verify', {
    params: { phone, captcha, ctcode: ctcode || '86', randomCNIP: true },
    ...loginRequestOptions,
  });
}

export function getLoginStatus() {
  return request.get('/login/status', preserveAuthRequestOptions);
}

export function getLoginUserDetail() {
  return request.get('/user/account', preserveAuthRequestOptions);
}

export function logout() {
  return request.get('/logout');
}
