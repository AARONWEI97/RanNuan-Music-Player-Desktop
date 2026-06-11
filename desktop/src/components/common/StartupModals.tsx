import { useState, useEffect } from 'react'
import DisclaimerModal from './DisclaimerModal'
import DonationModal from './DonationModal'
import pkg from '../../../package.json'

const STORAGE_KEY = 'ranNuan_startup_meta'

interface StartupMeta {
  lastVersion: string
}

function getMeta(): StartupMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveMeta(meta: StartupMeta) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meta)) } catch {}
}

/**
 * 首次运行 / 版本更新后，依次弹出免责声明 → 捐赠提示。
 * 用户关闭两个弹窗后，记录当前版本，下次不重复弹出。
 */
export default function StartupModals() {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showDonation, setShowDonation] = useState(false)

  useEffect(() => {
    const currentVersion = pkg.version
    const meta = getMeta()
    const isFirstRun = !meta
    const isUpdated = meta && meta.lastVersion !== currentVersion

    if (isFirstRun || isUpdated) {
      setShowDisclaimer(true)
    }
  }, [])

  const handleDisclaimerClose = () => {
    setShowDisclaimer(false)
    setShowDonation(true)
  }

  const handleDonationClose = () => {
    setShowDonation(false)
    const currentVersion = pkg.version
    saveMeta({ lastVersion: currentVersion })
  }

  return (
    <>
      <DisclaimerModal open={showDisclaimer} onClose={handleDisclaimerClose} />
      <DonationModal open={showDonation} onClose={handleDonationClose} />
    </>
  )
}
