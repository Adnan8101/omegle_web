import { NextResponse } from "next/server";
import { prismaBot } from "@/lib/prismaBot";
import { removeGuildMemberRole, sendDM } from "@/lib/discord";
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || "cron123"}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const expiredSubs = await (prismaBot as any).donatorSubscription.findMany({
      where: {
        status: "active",
        expiry_date: { lte: new Date() }
      },
      include: { plan: true }
    });
    let processed = 0;
    for (const sub of expiredSubs) {
      const roleId = sub.plan?.linked_role_id;
      const guildId = sub.guild_id;
      const userId = sub.user_id;
      const planTitle = sub.plan?.title || 'Unknown Plan';
      if (userId && roleId && guildId) {
        await removeGuildMemberRole(userId, roleId, guildId);
      }
      if (userId) {
        await sendDM(userId, {
          embed: {
            title: '⏰ Subscription Expired',
            description: `Your **${planTitle}** donator subscription has expired. The associated role has been removed.`,
            color: 0xf59e0b,
            fields: [
              { name: 'Plan', value: planTitle, inline: true },
              { name: 'Status', value: 'Expired', inline: true },
            ],
            footer: { text: 'Omeglee Donator System — You can re-subscribe anytime!' },
            timestamp: new Date().toISOString(),
          }
        });
      }
      await (prismaBot as any).donatorSubscription.update({
        where: { id: sub.id },
        data: { status: "expired" }
      });
      processed++;
    }
    return NextResponse.json({ success: true, processed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}