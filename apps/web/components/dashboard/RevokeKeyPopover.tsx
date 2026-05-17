"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

interface RevokeKeyPopoverProps {
  keyId: string
  onRevoked: () => void
}

export function RevokeKeyPopover({ keyId, onRevoked }: RevokeKeyPopoverProps) {
  const [open, setOpen] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      setErrorMessage("")
      const response = await fetch(`/api/keys/${keyId}/revoke`, { method: "PATCH" })
      if (!response.ok) {
        throw new Error("Failed to revoke key")
      }
      onRevoked()
      setOpen(false)
    } catch {
      setErrorMessage("Could not revoke key. Please try again.")
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive transition-colors duration-150">
          Revoke
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Revoke this key?</h4>
          <p className="text-sm text-muted-foreground">
            This key will enter a 2-hour grace period before being fully revoked. Your pipelines can switch to a
            new key during this time.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="transition-colors duration-150"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevoke}
            disabled={isRevoking}
            className="transition-colors duration-150 text-muted-foreground"
          >
            {isRevoking && <Loader2 className="size-4 animate-spin" />}
            Revoke
          </Button>
        </div>
        {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
      </PopoverContent>
    </Popover>
  )
}
