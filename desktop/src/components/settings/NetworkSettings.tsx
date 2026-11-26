import { useState } from 'react'
import { Activity, CircleCheck, CircleHelp, CircleX } from 'lucide-react'
import { checkMusicConnection, type MusicConnectionResult } from '@/services/checkMusicConnection'
import { SettingGroup, SettingRow } from './SettingControls'

const connectionStates = {
  available: { label: '连接正常', detail: '音乐服务返回了有效响应。', icon: CircleCheck },
  unavailable: { label: '连接失败', detail: '暂时无法连接音乐服务，可以稍后重试。', icon: CircleX },
  unexpected: { label: '服务响应异常', detail: '音乐服务返回的数据格式异常。', icon: CircleX },
}

export default function NetworkSettings() {
  const [result, setResult] = useState<MusicConnectionResult>()
  const [checking, setChecking] = useState(false)

  async function testConnection() {
    setChecking(true)
    try {
      setResult(await checkMusicConnection())
    } finally {
      setChecking(false)
    }
  }

  const status = result && connectionStates[result.state]
  const StatusIcon = status?.icon ?? CircleHelp
  return (
    <>
      <SettingGroup id="settings-connection" title="服务诊断">
        <SettingRow title="音乐服务" detail="检测首页与搜索所用的服务连接。">
          <button type="button" className="settings-button is-primary" disabled={checking} onClick={testConnection}>
            <Activity size={16} aria-hidden="true" />{checking ? '检测中…' : '检测连接'}
          </button>
        </SettingRow>
        <div className="settings-connection" role="status" aria-live="polite" data-state={checking ? undefined : result?.state}>
          <StatusIcon size={18} aria-hidden="true" />
          <div>
            <strong>{checking ? '正在检测' : status?.label ?? '尚未检测'}</strong>
            {!checking && status && <p className="settings-note">{status.detail}</p>}
            {!checking && result && <p className="settings-note">{result.elapsedMs} ms · {result.checkedAt.toLocaleTimeString('zh-CN')}</p>}
          </div>
        </div>
      </SettingGroup>
      <SettingGroup id="settings-sources" title="播放音源">
        <SettingRow title="自动选择音源" detail="首选音源无法播放时，播放器会尝试其他可用音源。">
          <span className="settings-value">自动回退</span>
        </SettingRow>
        <SettingRow title="单曲音源" detail="播放时使用底部播放栏的音源菜单，可为当前歌曲选择音源。" />
      </SettingGroup>
    </>
  )
}
