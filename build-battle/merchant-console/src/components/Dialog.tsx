// Tremor-style Dialog, on the same Radix primitive as Drawer.
// Radix handles the accessible name (Title), focus trap, focus return to the
// trigger on close, and Escape to close.

import * as DialogPrimitives from "@radix-ui/react-dialog"
import { RiCloseLine } from "@remixicon/react"
import * as React from "react"

import { cx, focusRing } from "@/lib/utils"

import { Button } from "./Button"

const Dialog = (
  props: React.ComponentPropsWithoutRef<typeof DialogPrimitives.Root>,
) => <DialogPrimitives.Root tremor-id="tremor-raw" {...props} />
Dialog.displayName = "Dialog"

const DialogTrigger = DialogPrimitives.Trigger
const DialogClose = DialogPrimitives.Close

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Content>
>(({ className, children, ...props }, forwardedRef) => (
  <DialogPrimitives.Portal>
    <DialogPrimitives.Overlay className="fixed inset-0 z-50 overflow-y-auto bg-black/30">
      <DialogPrimitives.Content
        ref={forwardedRef}
        className={cx(
          // base
          "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-md border p-4 shadow-lg focus:outline-none sm:p-6",
          // border color
          "border-gray-200 dark:border-gray-900",
          // background color
          "bg-white dark:bg-[#090E1A]",
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitives.Close asChild>
          <Button
            variant="ghost"
            aria-label="Close"
            className="absolute right-3 top-3 aspect-square p-1 hover:bg-gray-100 hover:dark:bg-gray-400/10"
          >
            <RiCloseLine className="size-5" aria-hidden="true" />
          </Button>
        </DialogPrimitives.Close>
      </DialogPrimitives.Content>
    </DialogPrimitives.Overlay>
  </DialogPrimitives.Portal>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cx("flex flex-col gap-y-1 pr-8", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Title>
>(({ className, ...props }, forwardedRef) => (
  <DialogPrimitives.Title
    ref={forwardedRef}
    className={cx(
      "text-base font-semibold text-gray-900 dark:text-gray-50",
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Description>
>(({ className, ...props }, forwardedRef) => (
  <DialogPrimitives.Description
    ref={forwardedRef}
    className={cx("text-sm text-gray-500 dark:text-gray-500", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx(
      "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
