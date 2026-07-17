"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Git Icon Components
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" height="14" width="14" className={className} style={{ color: "currentColor" }}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M8 .13c-4.42 0-8 3.6-8 8.07 0 3.57 2.3 6.58 5.47 7.65.4.08.55-.17.55-.39L6 13.96c-2.23.49-2.7-.95-2.7-.95-.35-.94-.88-1.18-.88-1.18-.73-.5.05-.5.05-.5.8.06 1.23.84 1.23.84.72 1.22 1.87.88 2.33.66.07-.52.28-.88.5-1.08-1.77-.19-3.64-.88-3.64-3.98 0-.88.32-1.6.82-2.16-.07-.2-.35-1.03.08-2.14 0 0 .68-.21 2.2.83a7.7 7.7 0 0 1 4 0c1.53-1.04 2.2-.83 2.2-.83.45 1.11.17 1.94.09 2.14.52.56.82 1.28.82 2.16 0 3.1-1.87 3.78-3.66 3.98.3.26.54.74.54 1.5v2.21c0 .22.14.47.54.4A8.1 8.1 0 0 0 16 8.2 8 8 0 0 0 8 .13"
      clipRule="evenodd"
    />
  </svg>
)

const GitlabIcon = ({ className }: { className?: string }) => (
  <svg aria-label="gitlab" height="14" width="14" viewBox="0 0 24 22" className={className} style={{ color: "white" }}>
    <path d="M1.279 8.29L.044 12.294c-.117.367 0 .78.325 1.014l11.323 8.23-.009-.012-.03-.039L1.279 8.29zM22.992 13.308a.905.905 0 00.325-1.014L22.085 8.29 11.693 21.52l11.299-8.212z" fill="currentColor"></path>
    <path d="M1.279 8.29l10.374 13.197.03.039.01-.006L22.085 8.29H1.28z" fill="currentColor" opacity="0.4"></path>
    <path d="M15.982 8.29l-4.299 13.236-.004.011.014-.017L22.085 8.29h-6.103zM7.376 8.29H1.279l10.374 13.197L7.376 8.29z" fill="currentColor" opacity="0.6"></path>
    <path d="M18.582.308l-2.6 7.982h6.103L19.48.308c-.133-.41-.764-.41-.897 0zM1.279 8.29L3.88.308c.133-.41.764-.41.897 0l2.6 7.982H1.279z" fill="currentColor" opacity="0.4"></path>
  </svg>
)

const BitbucketIcon = ({ className }: { className?: string }) => (
  <svg height="14" viewBox="-2 -2 65 59" width="14" className={className}>
    <defs>
      <linearGradient id="bitbucket-grad" x1="104.953%" x2="46.569%" y1="21.921%" y2="75.234%">
        <stop offset="7%" stopColor="currentColor" stopOpacity=".4"></stop>
        <stop offset="100%" stopColor="currentColor"></stop>
      </linearGradient>
    </defs>
    <path d="M59.696 18.86h-18.77l-3.15 18.39h-13L9.426 55.47a2.71 2.71 0 001.75.66h40.74a2 2 0 002-1.68l5.78-35.59z" fill="url(#bitbucket-grad)" fillRule="nonzero" transform="translate(-.026 .82)"></path>
    <path d="M2 .82a2 2 0 00-2 2.32l8.49 51.54a2.7 2.7 0 00.91 1.61 2.71 2.71 0 001.75.66l15.76-18.88H24.7l-3.47-18.39h38.44l2.7-16.53a2 2 0 00-2-2.32L2 .82z" fill="currentColor" fillRule="nonzero"></path>
  </svg>
)

const DefaultUserIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-full opacity-40 p-[20%]">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
)

export interface AvatarProps extends React.ComponentPropsWithoutRef<"span"> {
  src?: string
  alt?: string
  name?: string
  size?: number
  mask?: boolean
  gitType?: "github" | "gitlab" | "bitbucket"
  initials?: string
  icon?: React.ReactNode
  resolved?: boolean
  badge?: React.ReactNode
}

export function Avatar({
  src,
  alt = "",
  name = "",
  size = 32,
  mask = true,
  gitType,
  initials,
  icon,
  resolved = true,
  badge,
  className,
  style,
  ...props
}: AvatarProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false)

  // Show skeleton if not resolved OR if src is provided but not yet loaded
  const showSkeleton = !resolved || (!!src && !imageLoaded)

  const avatarContent = (
    <span
      data-geist-avatar=""
      data-mask={mask ? "true" : "false"}
      data-resolved={showSkeleton ? "false" : "true"}
      data-version="v1"
      role="img"
      aria-label={alt || name || "Avatar"}
      className={cn(
        "inline-block relative shrink-0 overflow-hidden leading-0 align-top transition-[background] duration-200 ease-in-out",
        mask ? "rounded-full" : "rounded-md",
        // border pseudo-element
        "after:content-[''] after:absolute after:inset-0 after:border after:border-[var(--ds-gray-alpha-400)]",
        mask ? "after:rounded-full" : "after:rounded-md",
        "data-[mask=false]:after:hidden",
        // loading gradient pseudo-element
        "data-[resolved=false]:before:content-[''] data-[resolved=false]:before:absolute data-[resolved=false]:before:inset-0",
        mask ? "data-[resolved=false]:before:rounded-full" : "data-[resolved=false]:before:rounded-md",
        "data-[resolved=false]:before:bg-gradient-to-r data-[resolved=false]:before:from-[#111] data-[resolved=false]:before:via-[#333] data-[resolved=false]:before:to-[#111] data-[resolved=false]:before:bg-[length:400%_100%] data-[resolved=false]:before:animate-loading",
        className
      )}
      style={{
        width: size,
        height: size,
        "--size": `${size}px`,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {/* If resolved and image src is provided */}
      {resolved && src && (
        <img
          src={src}
          alt={alt || name}
          title={name}
          loading="eager"
          width={size}
          height={size}
          onLoad={() => setImageLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Initials Fallback */}
      {resolved && !src && initials && (
        <span className="flex justify-center items-center h-full w-full font-medium text-white opacity-50 bg-[var(--ds-gray-600)]" style={{ fontSize: `${Math.max(size * 0.35, 10)}px` }}>
          {initials}
        </span>
      )}

      {/* Custom Icon Fallback */}
      {resolved && !src && !initials && icon && (
        <span className="flex justify-center items-center h-full w-full bg-[var(--ds-background-100)] text-[var(--ds-gray-900)]">
          {icon}
        </span>
      )}

      {/* Default Placeholder User Icon */}
      {resolved && !src && !initials && !icon && (
        <span className="flex justify-center items-center h-full w-full bg-[var(--ds-background-100)] text-[var(--ds-gray-900)]">
          <DefaultUserIcon />
        </span>
      )}
    </span>
  )

  // Enclose in relative wrapper if git badge or custom badge is present
  if (gitType || badge) {
    const badgeBg = gitType === "github" 
      ? "bg-white dark:bg-black border-white dark:border-black text-[#000000] dark:text-white" 
      : gitType === "gitlab" 
      ? "bg-[#6b4fbb] text-white border-white dark:border-black"
      : gitType === "bitbucket"
      ? "bg-[#0052cc] text-white border-white dark:border-black"
      : "bg-white dark:bg-black border-white dark:border-black"

    const badgeIcon = gitType === "github" 
      ? <GithubIcon className="size-full scale-[0.7]" />
      : gitType === "gitlab"
      ? <GitlabIcon className="size-full scale-[0.7]" />
      : gitType === "bitbucket"
      ? <BitbucketIcon className="size-full scale-[0.6]" />
      : badge

    // Scale badge size with avatar size
    const badgeSize = Math.max(Math.round(size * 0.4375), 14) // 32px avatar -> 14px badge
    const badgeOffset = -Math.round(size * 0.09) // 32px avatar -> -3px offset

    return (
      <div 
        className="relative inline-block shrink-0" 
        style={{ 
          width: size, 
          height: size 
        }}
      >
        {avatarContent}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inline-flex aspect-square items-center justify-center leading-none rounded-full overflow-hidden border",
            badgeBg
          )}
          style={{
            width: badgeSize,
            height: badgeSize,
            left: badgeOffset,
            bottom: badgeOffset,
          }}
        >
          {badgeIcon}
        </div>
      </div>
    )
  }

  return avatarContent
}

// AvatarGroup Component
export interface AvatarGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  limit?: number
  size?: number
  overlap?: number
  reverse?: boolean
}

export function AvatarGroup({
  children,
  limit,
  size = 32,
  overlap,
  reverse = false,
  className,
  style,
  ...props
}: AvatarGroupProps) {
  // Enforce size on all child Avatars
  const arrayChildren = React.Children.toArray(children)
  const totalCount = arrayChildren.length

  // Calculate dynamic overlap if not explicitly provided
  // size < 20 -> 5px
  // size < 28 -> 7px
  // size < 40 -> 10px
  // size >= 40 -> 14px
  const calculatedOverlap = overlap !== undefined 
    ? overlap 
    : size < 20 
    ? 5 
    : size < 28 
    ? 7 
    : size < 40 
    ? 10 
    : 14

  const visibleLimit = limit !== undefined ? limit : totalCount
  const visibleChildren = arrayChildren.slice(0, visibleLimit)
  const remainingCount = totalCount - visibleLimit

  return (
    <div
      className={cn("flex items-center", className)}
      style={{
        "--avatar-overlap": `${calculatedOverlap}px`,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {visibleChildren.map((child, index) => {
        if (!React.isValidElement(child)) return null

        // Assign z-index based on reverse stacking order
        // By default (reverse=false), first sits on top (highest index)
        const zIndex = reverse ? index : visibleLimit - index

        const isLastVisible = index === visibleLimit - 1
        const hasCounter = isLastVisible && remainingCount > 0

        // Clone Avatar and inject props
        const childElement = child as React.ReactElement<{ className?: string; style?: React.CSSProperties; size?: number }>
        const avatarElement = React.cloneElement(childElement, {
          size,
          className: cn(
            // Rings around overlap
            "shadow-[0_0_0_1px_var(--geist-background)]",
            childElement.props.className
          ),
          style: {
            ...childElement.props.style,
          },
        })

        if (hasCounter) {
          // Wrap the last visible avatar in a relative counter container
          const counterFontSize = Math.max(Math.round(size * 0.3125), 9) // 32px avatar -> 10px font
          const counterLeading = Math.max(Math.round(size * 0.375), 11) // 32px avatar -> 12px leading

          return (
            <span
              key={index}
              className="nth-[n+2]:ml-[calc(-1*var(--avatar-overlap))] inline-flex items-center rounded-full relative group"
              style={{ zIndex }}
              title={`${remainingCount} more avatars in this group`}
            >
              {avatarElement}
              <span 
                className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--ds-gray-400)] bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)] font-semibold scale-[1.01]"
                style={{
                  fontSize: counterFontSize,
                  lineHeight: `${counterLeading}px`,
                }}
              >
                +{remainingCount}
              </span>
            </span>
          )
        }

        return (
          <span
            key={index}
            className="nth-[n+2]:ml-[calc(-1*var(--avatar-overlap))] inline-flex items-center rounded-full relative"
            style={{ zIndex }}
          >
            {avatarElement}
          </span>
        )
      })}
    </div>
  )
}
