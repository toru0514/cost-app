import * as React from "react"

import { Input } from "./input"

export type NumberInputValue = number | ""

type NumberInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "onFocus" | "onBlur"> & {
  value: NumberInputValue
  onValueChange: (value: NumberInputValue) => void
  selectOnFocus?: boolean
  enableCommaSeparator?: boolean
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

const formatWithCommas = (value: number): string => {
  return new Intl.NumberFormat("ja-JP").format(value)
}

const parseFormattedNumber = (value: string): number | "" => {
  const cleaned = value.replace(/,/g, "")
  if (cleaned === "") return ""
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? "" : parsed
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onValueChange, selectOnFocus = true, enableCommaSeparator = false, onFocus, onBlur, ...props },
  ref
) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [localValue, setLocalValue] = React.useState<string>("")

  // カンマ区切りモード: focus中は生の数値、blur時はフォーマット済み
  const displayValue = React.useMemo(() => {
    if (!enableCommaSeparator) {
      return value === "" ? "" : String(value)
    }
    if (isFocused) {
      return localValue
    }
    return value === "" ? "" : formatWithCommas(value)
  }, [enableCommaSeparator, isFocused, localValue, value])

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      if (enableCommaSeparator) {
        setLocalValue(raw)
        const parsed = parseFormattedNumber(raw)
        if (parsed === "" || !Number.isNaN(parsed)) {
          onValueChange(parsed)
        }
        return
      }
      if (raw === "") {
        onValueChange("")
        return
      }
      const parsed = Number(raw)
      if (Number.isNaN(parsed)) return
      onValueChange(parsed)
    },
    [onValueChange, enableCommaSeparator]
  )

  const handleFocus = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      setLocalValue(value === "" ? "" : String(value))
      if (selectOnFocus) {
        event.target.select()
      }
      onFocus?.(event)
    },
    [value, selectOnFocus, onFocus]
  )

  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(event)
    },
    [onBlur]
  )

  return (
    <Input
      {...props}
      ref={ref}
      type={enableCommaSeparator ? "text" : "number"}
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
})

export { NumberInput }
