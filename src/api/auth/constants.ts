export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'dev_secret_change_me',

  // Make TypeScript happy: explicitly declare expiresIn as either
  // a number (seconds) or a valid duration string such as "60s", "1h", "1d", etc.
  expiresIn: (process.env.JWT_EXPIRES_IN || '86400s') as
    | number
    | `${number}s`
    | `${number}m`
    | `${number}h`
    | `${number}d`,
};
