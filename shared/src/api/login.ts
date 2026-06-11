import request from './request';

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
  return request.get('/login/cellphone', {
    params: { phone, password, randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function loginByCaptcha(phone: string, captcha: string) {
  return request.get('/login/cellphone', {
    params: { phone, captcha, randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function loginByEmail(email: string, password: string) {
  return request.get('/login', {
    params: { email, password, randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function loginByUid(uid: string | number) {
  return request.get('/user/detail', {
    params: { uid }
  });
}

export function registerAnonymous() {
  return request.get('/register/anonimous', {
    params: { randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function refreshLogin() {
  return request.get('/login/refresh', {
    params: { randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function sendCaptcha(phone: string, ctcode?: string) {
  return request.get('/captcha/sent', {
    params: { phone, ctcode: ctcode || '86', randomCNIP: true, realIP: '116.25.146.177' }
  });
}

export function verifyCaptcha(phone: string, captcha: string, ctcode?: string) {
  return request.get('/captcha/verify', {
    params: { phone, captcha, ctcode: ctcode || '86', randomCNIP: true, realIP: '116.25.146.177' }
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
