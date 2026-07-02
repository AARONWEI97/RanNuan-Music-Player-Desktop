import request from './request';

const loginRequestOptions = {
  noRetry: true,
  skipAuthCookie: true,
} as any;

export function getQrKey() {
  return request.get('/login/qr/key');
}

export function createQr(key: any) {
  return request.get('/login/qr/create', { params: { key, qrimg: true } });
}

export function checkQr(key: any) {
  return request.get('/login/qr/check', { params: { key, noCookie: true } });
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

export function refreshLogin() {
  return request.get('/login/refresh', {
    params: { randomCNIP: true }
  });
}

export function sendCaptcha(phone: string, ctcode?: string) {
  return request.get('/captcha/sent', {
    params: { phone, ctcode: ctcode || '86', randomCNIP: true },
    ...loginRequestOptions,
  });
}

export function verifyCaptcha(phone: string, captcha: string, ctcode?: string) {
  return request.get('/captcha/verify', {
    params: { phone, captcha, ctcode: ctcode || '86', randomCNIP: true },
    ...loginRequestOptions,
  });
}

export function getLoginStatus() {
  return request.get('/login/status');
}

export function getLoginUserDetail() {
  return request.get('/user/account');
}

export function logout() {
  return request.get('/logout');
}
