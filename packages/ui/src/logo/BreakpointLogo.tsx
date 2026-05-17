interface BreakpointLogoProps {
  size?: number
  className?: string
}

export const BreakpointLogo = ({ size = 32, className }: BreakpointLogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Breakpoint logo"
  >
    <path
      d="M9.5 9L16 5.25L22.5 9V16.5L16 20.25L9.5 16.5V9Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      opacity="0.92"
    />
    <path d="M16 7.25V18.25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4.5 12.75H9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
    <path d="M22.5 12.75H27.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
    <path d="M16 20.25V26.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
    <circle cx="16" cy="27.5" r="1.5" fill="currentColor" />
  </svg>
)
