// Shared constants for the web application
export const GUILD_ID = '910043773130661918';

// Default avatar fallback
export function getAvatarFallback(userId: string): string {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId.slice(-4)) % 5}.png`;
}

// Safe error message extraction
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
}
