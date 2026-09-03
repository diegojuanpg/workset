import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Geist typography utilities (text-copy-14, text-label-12, …) are font sizes,
// not colors — without this tailwind-merge drops them against text-foreground.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: [(value: string) => /^(heading|copy|label|button)-\d+$/.test(value)] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
