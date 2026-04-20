'use client'

interface Props {
  message: string
}

export default function MessageToast({ message }: Props) {
  return (
    <div className="app-message-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
