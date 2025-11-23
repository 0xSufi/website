import * as React from "react"

export interface TooltipProps {
  showArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement>
  content: React.ReactNode
  contentProps?: Record<string, any>
  disabled?: boolean
  children: React.ReactNode
  placement?: "top" | "bottom" | "left" | "right"
  openDelay?: number
  closeDelay?: number
}

// Temporary tooltip component that safely wraps children
// This is a workaround for Chakra UI v3 Tooltip compatibility issues
export function Tooltip(props: TooltipProps) {
  const { children, content, disabled } = props

  // If disabled, just return children
  if (disabled) {
    return <>{children}</>
  }

  // For now, wrap children in a div with title attribute
  // This provides basic tooltip functionality without Chakra UI complexity
  return (
    <div 
      style={{ display: 'inline-block' }}
      title={typeof content === 'string' ? content : undefined}
    >
      {children}
    </div>
  )
}