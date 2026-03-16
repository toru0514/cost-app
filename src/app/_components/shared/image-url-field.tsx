"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MicroCmsImagePickerDialog } from "./microcms-image-picker-dialog"

interface ImageUrlFieldProps {
  value: string
  onChange: (url: string) => void
  placeholder?: string
  inputClassName?: string
}

export function ImageUrlField({
  value,
  onChange,
  placeholder = "https://example.com/image.jpg",
  inputClassName,
}: ImageUrlFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => setPickerOpen(true)}
        title="microCMS画像を選択"
      >
        <ImageIcon className="size-4" />
      </Button>
      <MicroCmsImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => onChange(url)}
      />
    </div>
  )
}
