export const USERNAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
export const USERNAME_MAX_LENGTH = 48;

export const USERNAME_RULES =
  "Usernames must be lowercase, begin with an alphanumeric character, followed by more alphanumeric characters or dashes, and ending with an alphanumeric character.";

export function isValidUsername(username: string): boolean {
  return (
    username.length > 0 &&
    username.length <= USERNAME_MAX_LENGTH &&
    USERNAME_REGEX.test(username)
  );
}

// Vercel-style suggestion: email local part slugified + 4 random digits.
export function suggestUsername(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH - 5);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return base ? `${base}-${digits}` : `user-${digits}`;
}
