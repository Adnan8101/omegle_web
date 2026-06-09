export const MAIN_OWNER_ID = '929297205796417597';
export const EDITORS = [MAIN_OWNER_ID, '1066281404821930025', '1058043072522489946'];
const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD  = 0x0000000000000020n;
export async function verifyAccess(session: any, guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  const userId = String(session?.user?.id || '');
  if (!userId) return false;
  if (EDITORS.includes(userId)) return true;
  const [memberRes, rolesRes, guildRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
  ]);
  if (!memberRes.ok || !guildRes.ok) return false;
  const guild  = await guildRes.json().catch(() => null);
  const member = await memberRes.json().catch(() => null);
  if (String(guild?.owner_id) === userId) return true;
  const roles  = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];
  const roleMap = new Map<string, bigint>();
  for (const r of Array.isArray(roles) ? roles : []) {
    try { roleMap.set(String(r.id), BigInt(r.permissions || '0')); } catch { }
  }
  let effective = 0n;
  for (const rid of Array.isArray(member?.roles) ? member.roles : []) {
    effective |= roleMap.get(String(rid)) || 0n;
  }
  return (effective & ADMINISTRATOR) !== 0n || (effective & MANAGE_GUILD) !== 0n;
}