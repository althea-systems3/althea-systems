import * as React from "react"

import { cn } from "@/lib/utils"

type InputGroupAddonAlign =
  | "inline-start"
  | "inline-end"
  | "block-start"
  | "block-end"

const inlineStartAddonClassName =
  "pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
const inlineEndAddonClassName =
  "pointer-events-none absolute end-3 top-1/2 -translate-y-1/2"
const blockStartAddonClassName = "mb-2"
const blockEndAddonClassName = "mt-2"

function getAddonPositionClassName(align: InputGroupAddonAlign): string {
  if (align === "inline-start") {
    return inlineStartAddonClassName
  }

  if (align === "inline-end") {
    return inlineEndAddonClassName
  }

  if (align === "block-start") {
    return blockStartAddonClassName
  }

  return blockEndAddonClassName
}

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("relative min-w-0", className)} {...props} />
  )
})
InputGroup.displayName = "InputGroup"

type InputGroupAddonProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: InputGroupAddonAlign
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ align = "inline-start", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(getAddonPositionClassName(align), className)}
        {...props}
      />
    )
  },
)
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      data-slot="input-group-control"
      className={cn(
        "h-10 w-full rounded-full border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta",
        className,
      )}
      {...props}
    />
  )
})
InputGroupInput.displayName = "InputGroupInput"

export { InputGroup, InputGroupAddon, InputGroupInput }
