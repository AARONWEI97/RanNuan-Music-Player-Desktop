import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQrKey, createQr, checkQr, loginByCellphone, loginByCaptcha, loginByEmail, sendCaptcha, registerAnonymous } from '@shared'
import { useAuthStore } from '@/store/authStore'
import { QrCode, Smartphone, Mail, ArrowLeft, Loader2, UserX, Cookie } from 'lucide-react'

type LoginTab = 'qr' | 'email' | 'phone' | 'cookie'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [tab, setTab] = useState<LoginTab>('qr')

  // QR state
  const [qrImg, setQrImg] = useState('')
  const qrKeyRef = useRef('')
  const [qrStatus, setQrStatus] = useState<'waiting' | 'scanned' | 'expired' | 'loading'>('loading')
  const qrTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Phone state
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [useCaptcha, setUseCaptcha] = useState(false)
  const [captchaSent, setCaptchaSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Email state
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  // Cookie state
  const [cookieStr, setCookieStr] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ─── QR Login ───
  const startQrLogin = useCallback(async () => {
    try {
      setQrStatus('loading')
      setError('')
      const keyRes = await getQrKey()
      const unikey = keyRes?.data?.data?.unikey
      if (!unikey) {
        setError('获取二维码失败，请检查网络')
        setQrStatus('expired')
        return
      }
      qrKeyRef.current = unikey

      const imgRes = await createQr(unikey)
      setQrImg(imgRes?.data?.data?.qrimg || '')
      setQrStatus('waiting')

      if (qrTimer.current) clearInterval(qrTimer.current)
      const startTime = Date.now()
      qrTimer.current = setInterval(async () => {
        if (Date.now() - startTime > 300000) {
          setQrStatus('expired')
          if (qrTimer.current) clearInterval(qrTimer.current)
          return
        }
        try {
          const checkRes = await checkQr(unikey)
          const code = checkRes?.data?.code
          if (code === 800) {
            setQrStatus('expired')
            if (qrTimer.current) clearInterval(qrTimer.current)
          } else if (code === 801) {
            // 等待扫码 - 保持 waiting 状态
          } else if (code === 802) {
            setQrStatus('scanned')
          } else if (code === 803) {
            if (qrTimer.current) clearInterval(qrTimer.current)
            // 803 状态码下会返回 cookies
            const cookie = checkRes?.data?.cookie
            if (cookie) {
              await login(cookie)
              navigate(-1)
            } else {
              // noCookie 模式下可能没有 cookie 字段，尝试从 response header 获取
              const headerCookie = checkRes?.headers?.['set-cookie']
              if (headerCookie) {
                const cookieStr = Array.isArray(headerCookie) ? headerCookie.join('; ') : headerCookie
                await login(cookieStr)
                navigate(-1)
              } else {
                setError('登录成功但未获取到凭证，请重试')
              }
            }
          }
        } catch {
          // QR check polling error - ignore and retry
        }
      }, 3000)
    } catch {
      setQrStatus('expired')
    }
  }, [login, navigate])

  useEffect(() => {
    if (tab === 'qr') {
      const run = async () => { await startQrLogin() }
      run()
    } else {
      if (qrTimer.current) clearInterval(qrTimer.current)
    }
    return () => {
      if (qrTimer.current) clearInterval(qrTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ─── Countdown ───
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ─── Phone Login ───
  const handlePhoneLogin = async () => {
    if (!phone.trim()) return setError('请输入手机号')
    setLoading(true)
    setError('')
    try {
      let res
      if (useCaptcha) {
        if (!captchaCode.trim()) { setError('请输入验证码'); setLoading(false); return }
        res = await loginByCaptcha(phone, captchaCode)
      } else {
        if (!password.trim()) { setError('请输入密码'); setLoading(false); return }
        res = await loginByCellphone(phone, password)
      }
      // API 文档: v3.30.0 后登录接口返回内容新增 cookie 字段
      const cookie = res?.data?.cookie
      if (cookie) {
        await login(cookie)
        navigate(-1)
      } else if (res?.data?.account?.id) {
        // 登录成功但 cookie 字段为空，尝试用 token 或重新获取
        const headerCookie = res?.headers?.['set-cookie']
        if (headerCookie) {
          const cookieStr = Array.isArray(headerCookie) ? headerCookie.join('; ') : headerCookie
          await login(cookieStr)
        } else {
          // 最后兜底：保存空 token，让 checkLoginStatus 通过 cookie 自动验证
          await login('')
        }
        navigate(-1)
      } else {
        const code = res?.data?.code
        if (code === 502) {
          setError('服务器错误，请稍后重试')
        } else {
          setError(res?.data?.message || res?.data?.msg || '登录失败，请检查账号密码')
        }
      }
    } catch (e: unknown) {
      const errData = (e as { response?: { data?: { message?: string; msg?: string; code?: number } } })?.response?.data
      if (errData?.code === 502) {
        setError('服务器错误，请稍后重试')
      } else {
        setError(errData?.message || errData?.msg || '登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendCaptcha = async () => {
    if (!phone.trim()) return setError('请输入手机号')
    try {
      await sendCaptcha(phone)
      setCaptchaSent(true)
      setCountdown(60)
    } catch {
      setError('发送验证码失败')
    }
  }

  // ─── Email Login ───
  const handleEmailLogin = async () => {
    if (!email.trim()) return setError('请输入邮箱')
    if (!emailPassword.trim()) return setError('请输入密码')
    setLoading(true)
    setError('')
    try {
      const res = await loginByEmail(email, emailPassword)
      const cookie = res?.data?.cookie
      if (cookie) {
        await login(cookie)
        navigate(-1)
      } else if (res?.data?.account?.id) {
        const headerCookie = res?.headers?.['set-cookie']
        if (headerCookie) {
          const cookieStr = Array.isArray(headerCookie) ? headerCookie.join('; ') : headerCookie
          await login(cookieStr)
        } else {
          await login('')
        }
        navigate(-1)
      } else {
        const code = res?.data?.code
        if (code === 502) {
          setError('服务器错误，请稍后重试')
        } else {
          setError(res?.data?.message || res?.data?.msg || '登录失败')
        }
      }
    } catch (e: unknown) {
      const errData = (e as { response?: { data?: { message?: string; msg?: string; code?: number } } })?.response?.data
      if (errData?.code === 502) {
        setError('服务器错误，请稍后重试')
      } else {
        setError(errData?.message || errData?.msg || '登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Cookie Login ───
  const handleCookieLogin = async () => {
    if (!cookieStr.trim()) return setError('请粘贴Cookie')
    setLoading(true)
    setError('')
    try {
      await login(cookieStr.trim())
      navigate(-1)
    } catch {
      setError('Cookie无效或已过期，请重新获取')
    } finally {
      setLoading(false)
    }
  }

  // ─── Anonymous Login ───
  const handleAnonymousLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await registerAnonymous()
      const cookie = res?.data?.cookie
      if (cookie) {
        await login(cookie)
        navigate(-1)
      } else {
        setError('游客登录失败')
      }
    } catch {
      setError('游客登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: LoginTab; label: string; icon: typeof QrCode }[] = [
    { key: 'qr', label: '扫码登录', icon: QrCode },
    { key: 'email', label: '邮箱登录', icon: Mail },
    { key: 'cookie', label: 'Cookie登录', icon: Cookie },
    { key: 'phone', label: '手机登录', icon: Smartphone },
  ]

  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>

        <div className="bg-white dark:bg-[#222] rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">登录网易云音乐</h1>
          <p className="text-sm text-gray-500 text-center mb-6">登录后可同步歌单、收藏和推荐</p>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-[#e60026] text-[#e60026]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* QR Tab */}
          {tab === 'qr' && (
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4 relative">
                {qrStatus === 'loading' && (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                )}
                {qrStatus === 'waiting' && qrImg && (
                  <img src={qrImg} alt="QR Code" className="w-full h-full" />
                )}
                {qrStatus === 'scanned' && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <p className="text-white text-sm font-medium">扫描成功，请在手机上确认</p>
                  </div>
                )}
                {qrStatus === 'expired' && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center gap-2">
                    <p className="text-white text-sm">二维码已过期</p>
                    <button
                      onClick={startQrLogin}
                      className="px-4 py-1.5 bg-[#e60026] text-white text-sm rounded-full hover:bg-[#c4001f]"
                    >
                      点击刷新
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">打开网易云音乐APP扫码登录</p>
            </div>
          )}

          {/* Phone Tab */}
          {tab === 'phone' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                ⚠️ 手机号登录极易触发风控，建议优先使用扫码或邮箱登录
              </div>
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm"
                />
              </div>
              {!useCaptcha ? (
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码"
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneLogin()}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={captchaCode}
                    onChange={(e) => setCaptchaCode(e.target.value)}
                    placeholder="验证码"
                    maxLength={6}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneLogin()}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm"
                  />
                  <button
                    onClick={handleSendCaptcha}
                    disabled={countdown > 0}
                    className="px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s` : captchaSent ? '重新发送' : '获取验证码'}
                  </button>
                </div>
              )}
              <button
                onClick={() => setUseCaptcha(!useCaptcha)}
                className="text-xs text-[#e60026] hover:underline"
              >
                {useCaptcha ? '使用密码登录' : '使用验证码登录'}
              </button>
              <button
                onClick={handlePhoneLogin}
                disabled={loading}
                className="w-full py-2.5 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </div>
          )}

          {/* Email Tab */}
          {tab === 'email' && (
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm"
                />
              </div>
              <button
                onClick={handleEmailLogin}
                disabled={loading}
                className="w-full py-2.5 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </div>
          )}

          {/* Cookie Tab */}
          {tab === 'cookie' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>从浏览器登录网易云音乐后，打开开发者工具（F12）→ 网络 → 任意请求 → 请求头中的 Cookie 值</p>
                <p>也可从其他客户端复制完整 Cookie 字符串粘贴到下方</p>
              </div>
              <textarea
                value={cookieStr}
                onChange={(e) => setCookieStr(e.target.value)}
                placeholder="粘贴完整的Cookie字符串，如：MUSIC_U=xxx; __csrf=xxx; ..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm resize-none font-mono text-xs"
              />
              <button
                onClick={handleCookieLogin}
                disabled={loading}
                className="w-full py-2.5 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Anonymous login */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleAnonymousLogin}
              disabled={loading}
              className="w-full py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserX className="w-4 h-4" />
              游客登录（部分功能受限）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
