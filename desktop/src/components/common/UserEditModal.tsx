import { useEffect, useMemo, useRef, useState } from 'react'
import { updateUserInfo, uploadAvatar, parseAvatarUploadUrl } from '@shared'
import { X, Save, Loader, UserRound, Camera } from 'lucide-react'
import { avatarUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'

interface UserEditProfile {
  nickname?: string
  signature?: string
  gender?: number
  birthday?: number
  avatarUrl?: string
  province?: number
  city?: number
}

interface UserEditModalProps {
  open: boolean
  profile: UserEditProfile
  onClose: () => void
  onUpdated: (patch: UserEditProfile) => void
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function birthdayToInput(value?: number) {
  if (!value || value <= 0) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function compressAvatarFile(file: File, maxSize = 800, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (file.size <= 300 * 1024 && file.type === 'image/jpeg') {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('图片处理失败')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) throw new Error('图片处理失败')
  return blob
}

export default function UserEditModal({ open, profile, onClose, onUpdated }: UserEditModalProps) {
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [signature, setSignature] = useState(profile?.signature || '')
  const [gender, setGender] = useState(Number(profile?.gender || 0))
  const [birthday, setBirthday] = useState(birthdayToInput(profile?.birthday))
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  useEffect(() => () => clearPreviewUrl(), [])

  const changed = useMemo(() => {
    return nickname.trim() !== (profile?.nickname || '') ||
      signature.trim() !== (profile?.signature || '') ||
      Number(gender) !== Number(profile?.gender || 0) ||
      birthday !== birthdayToInput(profile?.birthday)
  }, [birthday, gender, nickname, profile, signature])

  if (!open) return null

  const handleAvatarPick = async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast('图片过大', '请选择 5MB 以内的图片')
      return
    }

    clearPreviewUrl()
    const localPreview = URL.createObjectURL(file)
    previewUrlRef.current = localPreview
    setAvatarPreview(localPreview)

    setUploadingAvatar(true)
    try {
      const payload = await compressAvatarFile(file)
      const res = await uploadAvatar(payload, 300)
      const nextAvatarUrl = parseAvatarUploadUrl(res)
      if (!nextAvatarUrl) {
        throw new Error('未获取到新头像地址')
      }
      clearPreviewUrl()
      setAvatarPreview(nextAvatarUrl)
      onUpdated({ avatarUrl: nextAvatarUrl })
      showToast('头像已更新')
    } catch (e: unknown) {
      clearPreviewUrl()
      setAvatarPreview(profile?.avatarUrl || '')
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      showToast('头像上传失败', err?.response?.data?.message || err?.message || '请稍后重试')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    const nextNickname = nickname.trim()
    const nextSignature = signature.trim()
    if (!nextNickname) {
      showToast('昵称不能为空')
      return
    }
    if (nextNickname.length > 30) {
      showToast('昵称过长', '请控制在 30 个字符以内')
      return
    }
    if (nextSignature.length > 300) {
      showToast('签名过长', '请控制在 300 个字符以内')
      return
    }

    const birthdayMs = birthday ? new Date(`${birthday}T00:00:00`).getTime() : 0
    setSaving(true)
    try {
      await updateUserInfo({
        nickname: nextNickname,
        signature: nextSignature,
        gender: Number(gender),
        birthday: birthdayMs,
        province: Number(profile?.province || 0),
        city: Number(profile?.city || 0),
      })
      const patch = {
        nickname: nextNickname,
        signature: nextSignature,
        gender: Number(gender),
        birthday: birthdayMs,
      }
      onUpdated(patch)
      showToast('资料已更新')
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      showToast('资料更新失败', err?.response?.data?.message || err?.message || '请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = avatarPreview || profile?.avatarUrl || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-950 dark:text-white">编辑资料</h3>
            <p className="mt-0.5 text-xs text-gray-400">保存后会同步到个人主页</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.035]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="group relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-700 disabled:opacity-70"
              title="更换头像"
            >
              {displayAvatar ? (
                <img src={avatarUrl(displayAvatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserRound className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar ? <Loader className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-white" />}
              </div>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{nickname || profile?.nickname || '用户'}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {uploadingAvatar ? '头像上传中...' : '点击头像可更换，支持 JPG / PNG，最大 5MB'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => handleAvatarPick(e.target.files?.[0])}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">昵称</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={30}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-[#e60026]/30 focus:ring-2 focus:ring-[#e60026]/15 dark:border-gray-700 dark:bg-white/[0.04]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">个人签名</label>
            <textarea
              value={signature}
              onChange={e => setSignature(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-6 outline-none transition-all focus:border-[#e60026]/30 focus:ring-2 focus:ring-[#e60026]/15 dark:border-gray-700 dark:bg-white/[0.04]"
              placeholder="写点什么介绍自己"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">{signature.length}/300</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">性别</label>
              <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1 dark:bg-white/[0.05]">
                {[
                  { value: 0, label: '保密' },
                  { value: 1, label: '男' },
                  { value: 2, label: '女' },
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setGender(item.value)}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${gender === item.value ? 'bg-white text-[#e60026] shadow-sm dark:bg-gray-700' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">生日</label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="h-[42px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition-all focus:border-[#e60026]/30 focus:ring-2 focus:ring-[#e60026]/15 dark:border-gray-700 dark:bg-white/[0.04]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06]">取消</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingAvatar || !changed}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#e60026] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c50020] disabled:opacity-40"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
