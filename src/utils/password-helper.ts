import * as bcrypt from 'bcryptjs';

export const hashPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

export function comparePassword(plain: string, hash?: string | null): boolean {
  if (!hash) return false;
  try { return bcrypt.compareSync(plain, hash); } catch { return false; }
}
