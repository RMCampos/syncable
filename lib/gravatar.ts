import crypto from 'crypto'

/**
 * Generates a Gravatar URL from an email address
 * @param email - The user's email address
 * @param size - The desired image size (default: 200)
 * @param defaultImage - The default image type if no Gravatar exists (default: 'identicon')
 * @returns The Gravatar URL
 */
export function getGravatarUrl(
  email: string,
  size: number = 200,
  defaultImage: 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'mp' = 'identicon'
): string {
  // Trim and lowercase the email
  const normalizedEmail = email.trim().toLowerCase()

  // Generate MD5 hash
  const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex')

  // Construct the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`
}
