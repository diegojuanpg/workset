import * as React from "react";

// Workset pixel-W mark (from Branding.md). Renders in currentColor.
export function WorksetMark({
  className,
  ...props
}: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="24 35 72 50"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="25.6" y="36.8" width="12" height="12" rx="1.2" />
      <rect x="48" y="37" width="18" height="12" rx="1.2" />
      <rect x="43" y="48.5" width="18" height="12" rx="1.2" />
      <rect x="37" y="60" width="18" height="12" rx="1.2" />
      <rect x="31.5" y="71" width="17.5" height="12" rx="1.2" />
      <rect x="76.5" y="37" width="17.5" height="12" rx="1.2" />
      <rect x="71" y="48.5" width="18" height="12" rx="1.2" />
      <rect x="65" y="60" width="18" height="12" rx="1.2" />
      <rect x="59.5" y="71" width="17.5" height="12" rx="1.2" />
    </svg>
  );
}

export function LogoGoogle({
  className,
  ...props
}: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g clipPath="url(#clip0_37_2010)">
        <path
          d="M8.16003 6.54492V9.64392H12.465C12.3733 10.1327 12.1836 10.598 11.9074 11.0116C11.6313 11.4252 11.2743 11.7788 10.858 12.0509L13.454 14.0649C14.967 12.6689 15.84 10.6179 15.84 8.18192C15.84 7.61492 15.789 7.06892 15.694 6.54592L8.16003 6.54492Z"
          fill="#4285F4"
        />
        <path
          d="M3.67594 9.52295L3.09094 9.97095L1.01794 11.5849C2.33394 14.1969 5.03194 15.9999 8.15994 15.9999C10.3199 15.9999 12.1299 15.2869 13.4539 14.0659L10.8579 12.0509C10.1449 12.5309 9.23594 12.8209 8.15994 12.8209C6.07994 12.8209 4.31194 11.4179 3.67994 9.52695L3.67594 9.52295Z"
          fill="#34A853"
        />
        <path
          d="M1.01804 4.41504C0.45337 5.52567 0.159369 6.7541 0.160035 8.00004C0.160035 9.29404 0.473035 10.509 1.01804 11.585C1.01804 11.593 3.68004 9.52004 3.68004 9.52004C3.52004 9.04004 3.42504 8.53004 3.42504 8.00004C3.42504 7.46904 3.52004 6.96004 3.68004 6.48004L1.01804 4.41504Z"
          fill="#FBBC05"
        />
        <path
          d="M8.15994 3.185C9.33794 3.185 10.3849 3.593 11.2219 4.378L13.5119 2.088C12.1229 0.792 10.3199 0 8.15994 0C5.03294 0 2.33394 1.796 1.01794 4.415L3.67994 6.48C4.31294 4.59 6.07994 3.185 8.15994 3.185Z"
          fill="#EA4335"
        />
      </g>
      <defs>
        <clipPath id="clip0_37_2010">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
