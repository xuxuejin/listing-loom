interface IconProps {
  className?: string;
}

export function PaletteIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 2.8v14.4M2.8 10h14.4M4.9 4.9l10.2 10.2M15.1 4.9 4.9 15.1" />
    </svg>
  );
}

export function CaptureIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 4.75h12M4 8.5h12M4 12.25h8M4 16h8" strokeLinecap="round" />
      <path d="M14 13.5h3v3h-3z" strokeLinejoin="round" />
    </svg>
  );
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M5 4.5h10v11H5z" strokeLinejoin="round" />
      <path d="M7.5 8h5M7.5 11h5M7.5 14h3" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="m3.5 6 4.5 4 4.5-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m3 8 3.2 3.2L13 4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M2.3 12s3.5-7 9.7-7 9.7 7 9.7 7-3.5 7-9.7 7-9.7-7-9.7-7z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.7 4.4 9.7 6.2a1.6 1.6 0 010 1.6 15 15 0 01-3.2 3.7M6.2 6.2a16 16 0 00-3.9 5 1.6 1.6 0 000 1.6C3.3 14.6 6.8 19 12 19c1.2 0 2.3-.3 3.3-.7" />
    </svg>
  );
}

export function DisclosureIcon({
  open,
  className,
}: IconProps & { open: boolean }) {
  const classNames = [className, open && 'rotate-90'].filter(Boolean).join(' ');
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className={classNames}
      fill="currentColor"
    >
      <path d="M2 1.1 6 4 2 6.9z" />
    </svg>
  );
}
