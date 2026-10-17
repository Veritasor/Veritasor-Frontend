import { useIntl } from 'react-intl'
import LocalePicker from './LocalePicker'

interface LocalePickerFieldProps {
  label?: string
  description?: string
}

export default function LocalePickerField({ label, description }: LocalePickerFieldProps) {
  const intl = useIntl()
  const resolvedLabel = label ?? intl.formatMessage({ id: 'settings.locale.label' })
  const resolvedDescription =
    description ?? intl.formatMessage({ id: 'settings.locale.description' })

  return (
    <div
      className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="locale-picker-field"
    >
      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {resolvedLabel}
      </label>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{resolvedDescription}</p>
      <LocalePicker />
    </div>
  )
}
