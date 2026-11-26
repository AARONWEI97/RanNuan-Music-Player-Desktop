import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function SettingGroup({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section id={id} className="settings-group" aria-labelledby={headingId}>
      <h3 id={headingId} tabIndex={-1}>{title}</h3>
      <div className="settings-panel">{children}</div>
    </section>
  )
}

export function SettingRow({ title, detail, children }: { title: string; detail?: ReactNode; children?: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <div className="settings-row-title">{title}</div>
        {detail && <div className="settings-note">{detail}</div>}
      </div>
      {children && <div className="settings-row-actions">{children}</div>}
    </div>
  )
}

export function SettingsSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" className="settings-switch" role="switch" aria-label={label} aria-checked={value} onClick={() => onChange(!value)}>
      <span />
    </button>
  )
}

export function SettingsSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: ReadonlyArray<readonly [string, string]>
  onChange: (value: string) => void
}) {
  return (
    <div className="settings-select">
      <select aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>
        {options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </div>
  )
}

export function ConfirmSetting({ title, children, action, danger, onCancel, onConfirm }: {
  title: string
  children: ReactNode
  action: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    cancel.current?.focus()
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={ref} className="settings-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onCancel() }}>
      <h3 id={titleId}>{title}</h3>
      <div className="settings-note" id={descriptionId}>{children}</div>
      <div className="settings-dialog-actions">
        <button ref={cancel} type="button" className="settings-button" onClick={onCancel}>取消</button>
        <button type="button" className={danger ? 'settings-button is-danger' : 'settings-button is-primary'} onClick={onConfirm}>{action}</button>
      </div>
    </dialog>
  )
}
