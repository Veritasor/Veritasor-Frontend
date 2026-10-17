import { useId } from 'react'
import { useIntl } from 'react-intl'
import LocalePicker from './LocalePicker'

interface LocalePickerFieldProps {
  label?: string
  description?: string
}

export default function LocalePickerField({ label, description }: LocalePickerFieldProps) {
  const intl = useIntl()
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div className="space-y2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <label
        id={labelId}
        className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        {label ?? intl.formatMessage({ id: 'settings.locale.label' })}
      </label>
      <p id={descriptionId} className="text-sm text-zinc-500 dark:text-zinc-400">
        {description ?? intl.formatMessage({ id: 'settings.locale.description' })}
      </p>
      <LocalePicker />
    </div>
  )
}
