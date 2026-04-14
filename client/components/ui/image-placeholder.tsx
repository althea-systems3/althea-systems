import { ImageOff } from "lucide-react"

import { cn } from "@/lib/utils"

type ImagePlaceholderProps = {
  label: string
  className?: string
  iconClassName?: string
  textClassName?: string
}

export function ImagePlaceholder({
  label,
  className,
  iconClassName,
  textClassName,
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center text-white">
        <ImageOff
          className={cn("size-7 sm:size-8", iconClassName)}
          aria-hidden="true"
        />
        <span
          className={cn("heading-font text-sm sm:text-base", textClassName)}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
