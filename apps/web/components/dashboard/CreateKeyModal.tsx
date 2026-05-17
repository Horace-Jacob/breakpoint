"use client"

import { Check, Copy, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"

interface CreateKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface CreateKeyResponse {
  id: string
  key: string
  prefix: string
}

interface ErrorResponse {
  error?: string
}

export function CreateKeyModal({ open, onOpenChange, onCreated }: CreateKeyModalProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const resetState = () => {
    setName("")
    setCreatedKey(null)
    setIsSubmitting(false)
    setCopied(false)
    setErrorMessage("")
  }

  const handleGenerate = async () => {
    if (!name.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      setErrorMessage("")
      const response = await fetch("/api/keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as ErrorResponse | null
        throw new Error(errorData?.error ?? "Failed to create key")
      }

      const data = (await response.json()) as CreateKeyResponse
      setCreatedKey(data)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage("Could not create API key. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!createdKey?.key) {
      return
    }

    await navigator.clipboard.writeText(createdKey.key)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleDone = () => {
    onOpenChange(false)
    onCreated()
    resetState()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetState()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Name your key so you can recognize it later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="key-name" className="text-sm font-medium">
                Key name
              </label>
              <Input
                id="key-name"
                placeholder="e.g. n8n production"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            <DialogFooter>
              <Button
                onClick={handleGenerate}
                disabled={!name.trim() || isSubmitting}
                className="transition-colors duration-150"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Generate Key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy your API key</DialogTitle>
              <DialogDescription>
                Save this key in your pipeline now. You will not be able to view it again.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              This key will not be shown again. Copy it now.
            </div>
            <div className="font-mono text-sm border rounded-lg p-3 w-full break-all bg-muted select-all">
              {createdKey.key}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="transition-colors duration-150"
              >
                <span className="transition-all duration-200">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </span>
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={handleDone} className="transition-colors duration-150">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
