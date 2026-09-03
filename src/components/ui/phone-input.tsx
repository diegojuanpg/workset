"use client";

import * as React from "react";
import { AsYouType, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useDismissable } from "@/hooks/use-dismissable";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/icons";

// Dropdown list (US/GB pinned, then alphabetical). Flag + dial code are derived,
// not hardcoded — libphonenumber owns the calling codes and as-you-type grouping.
const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "EC", name: "Ecuador" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GT", name: "Guatemala" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "PA", name: "Panama" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
];

// ISO country code → flag emoji (regional indicator letters).
function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const dialOf = (code: CountryCode): string => `+${getCountryCallingCode(code)}`;

export function PhoneInput({
  name,
  defaultCountry = "AR",
}: {
  name: string;
  defaultCountry?: CountryCode;
}) {
  const [value, setValue] = React.useState("");
  const [country, setCountry] = React.useState<CountryCode>(defaultCountry);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  useDismissable(ref, open, () => setOpen(false));

  const handleChange = (raw: string) => {
    const formatter = new AsYouType(country);
    const formatted = formatter.input(raw);
    setValue(formatted);
    const detected = formatter.getCountry();
    if (detected && detected !== country) setCountry(detected);
  };

  const pickCountry = (code: CountryCode) => {
    setCountry(code);
    const national = value.replace(/^\+\d+/, "").replace(/\D/g, "");
    setValue(new AsYouType(code).input(`+${getCountryCallingCode(code)}${national}`));
    setOpen(false);
    inputRef.current?.focus();
  };

  // Stored value always carries the country code.
  const submitValue = value.trim()
    ? value.trim().startsWith("+")
      ? value.trim()
      : `${dialOf(country)} ${value.trim()}`
    : "";

  return (
    <div ref={ref} className="relative">
      <div className="flex h-10 w-full items-center overflow-hidden rounded-lg bg-[var(--ds-background-100)] shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] transition-shadow hover:shadow-[0_0_0_1px_var(--ds-gray-alpha-500)] focus-within:shadow-[0_0_0_1px_var(--ds-gray-alpha-600),0_0_0_4px_rgba(0,0,0,0.16)] dark:focus-within:shadow-[0_0_0_1px_var(--ds-gray-alpha-600),0_0_0_4px_rgba(255,255,255,0.24)]">
        <button
          type="button"
          aria-label="Select country"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-full shrink-0 items-center gap-1 pr-2 pl-3 text-base transition-colors hover:bg-[var(--ds-gray-alpha-100)]"
        >
          <span className="text-[17px] leading-none">{flagEmoji(country)}</span>
          <ChevronDownIcon className="size-3 text-[var(--ds-gray-700)]" />
        </button>
        <input
          ref={inputRef}
          className="h-full min-w-0 flex-1 bg-transparent pr-3 text-base text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)]"
          inputMode="tel"
          maxLength={24}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`${dialOf(country)} 11 1234 5678`}
          type="tel"
          value={value}
        />
      </div>
      <input name={name} type="hidden" value={submitValue} />

      {open && (
        <ul
          role="listbox"
          className="material-menu absolute top-full left-0 z-50 mt-1 max-h-64 w-full min-w-72 overflow-y-auto p-1"
        >
          {COUNTRIES.map((c, i) => (
            <React.Fragment key={c.code}>
              {i === 2 && <li className="my-1 h-px bg-[var(--ds-gray-alpha-400)]" role="presentation" />}
              <li
                role="option"
                aria-selected={c.code === country}
                onClick={() => pickCountry(c.code)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--ds-gray-alpha-100)]",
                  c.code === country && "bg-[var(--ds-gray-alpha-100)]"
                )}
              >
                <span className="text-[17px] leading-none">{flagEmoji(c.code)}</span>
                <span className="flex-1 truncate text-[var(--ds-gray-1000)]">{c.name}</span>
                <span className="text-[var(--ds-gray-900)] tabular-nums">{dialOf(c.code)}</span>
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
