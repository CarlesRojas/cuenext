interface NativeSignInStatusProps {
  message: string
}

export function NativeSignInStatus({ message }: NativeSignInStatusProps) {
  return (
    <main className="screen-px screen-py flex size-full items-center justify-center text-center">
      <p className="text-neutral-400">{message}</p>
    </main>
  )
}
