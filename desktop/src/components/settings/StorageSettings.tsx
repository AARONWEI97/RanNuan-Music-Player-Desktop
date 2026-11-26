import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useSettingsStore } from '@shared'
import { clearPageCache, getPageCacheStats } from '@/utils/indexedDB'
import { showToast } from '@/utils/toast'
import {
  applySettingsPreferences, defaultSettingsPreferences, parseSettingsPreferences,
  serializeSettingsPreferences, type SettingsPreferences,
} from '@/services/settingsPreferences'
import { ConfirmSetting, SettingGroup, SettingRow, SettingsSwitch } from './SettingControls'

type PendingAction = { type: 'clear' } | { type: 'reset' } | { type: 'import'; preferences: SettingsPreferences }

const confirmations = {
  clear: { title: '清理页面缓存？', description: '将删除已缓存的首页和歌手资料。下次打开这些页面时会重新加载。', action: '清理缓存' },
  reset: { title: '恢复默认设置？', description: '外观、播放偏好、桌面行为和搜索快捷键将恢复默认。收藏、播放记录与本地音乐将保留。', action: '恢复默认' },
  import: { title: '导入设置备份？', description: '此备份中的外观、播放偏好、桌面行为和搜索快捷键将覆盖当前设置。', action: '导入设置' },
}

function describeCache({ entries, bytes }: { entries: number; bytes: number }) {
  const size = bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : (bytes / 1024).toFixed(1) + ' KB'
  return entries ? entries + ' 条 · 约 ' + size : '0 条'
}

export default function StorageSettings() {
  const enableCache = useSettingsStore(state => state.enableCache)
  const setEnableCache = useSettingsStore(state => state.setEnableCache)
  const fileInput = useRef<HTMLInputElement>(null)
  const [cacheLabel, setCacheLabel] = useState('正在读取…')
  const [pending, setPending] = useState<PendingAction>()
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let active = true
    getPageCacheStats().then(
      stats => { if (active) setCacheLabel(describeCache(stats)) },
      () => { if (active) setCacheLabel('无法读取缓存用量') },
    )
    return () => { active = false }
  }, [])

  function exportSettings() {
    const url = URL.createObjectURL(new Blob([serializeSettingsPreferences()], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rannuan-settings.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function stageImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const preferences = parseSettingsPreferences(await file.text())
      setPending({ type: 'import', preferences })
    } catch (error) {
      showToast('无法导入设置', error instanceof SyntaxError ? '文件不是有效的 JSON' : error instanceof Error ? error.message : '无法读取文件')
    }
  }

  async function confirm() {
    const action = pending
    setPending(undefined)
    if (!action) return
    setWorking(true)
    try {
      if (action.type === 'clear') {
        await clearPageCache()
        setCacheLabel(describeCache(await getPageCacheStats()))
        showToast('页面缓存已清理')
      } else {
        applySettingsPreferences(action.type === 'reset' ? defaultSettingsPreferences : action.preferences)
        showToast(action.type === 'reset' ? '已恢复默认设置' : '设置已导入')
      }
    } catch {
      showToast('操作失败', '请稍后重试')
    } finally {
      setWorking(false)
    }
  }

  const confirmation = pending && confirmations[pending.type]
  return (
    <>
      <SettingGroup id="settings-cache" title="页面缓存">
        <SettingRow title="使用页面缓存" detail="缓存首页和歌手资料，加快重复访问时的加载速度。">
          <SettingsSwitch label="使用页面缓存" value={enableCache} onChange={setEnableCache} />
        </SettingRow>
        <SettingRow title="缓存用量" detail={<span role="status">{cacheLabel}</span>}>
          <button type="button" className="settings-button" disabled={working} onClick={() => setPending({ type: 'clear' })}>
            <Trash2 size={15} aria-hidden="true" />清理缓存
          </button>
        </SettingRow>
      </SettingGroup>
      <SettingGroup id="settings-backup" title="备份与恢复">
        <SettingRow title="设置备份" detail="将个人偏好保存为 JSON 文件，也可以从备份恢复。">
          <input ref={fileInput} type="file" accept=".json,application/json" aria-label="选择设置备份文件" hidden onChange={stageImport} />
          <button type="button" className="settings-button" disabled={working} onClick={() => fileInput.current?.click()}>
            <Upload size={15} aria-hidden="true" />导入
          </button>
          <button type="button" className="settings-button" onClick={exportSettings}>
            <Download size={15} aria-hidden="true" />导出
          </button>
        </SettingRow>
        <SettingRow title="恢复默认设置" detail="恢复应用偏好，保留收藏、播放记录和本地音乐。">
          <button type="button" className="settings-button is-danger" disabled={working} onClick={() => setPending({ type: 'reset' })}>
            <RotateCcw size={15} aria-hidden="true" />恢复默认
          </button>
        </SettingRow>
      </SettingGroup>
      {pending && confirmation && (
        <ConfirmSetting title={confirmation.title} action={confirmation.action} danger={pending.type !== 'import'}
          onCancel={() => setPending(undefined)} onConfirm={confirm}>
          {confirmation.description}
        </ConfirmSetting>
      )}
    </>
  )
}
