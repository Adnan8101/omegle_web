import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
} from 'pdf-lib';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getAvatarUrl, getDiscordGuildInfo, getDiscordUser, getGuildRoleName } from '@/lib/discord';
import { readFileSync } from 'fs';
import { join } from 'path';
function hasAdminAccess(session: any): boolean {
  if (process.env.ADMIN_DEV_BYPASS === 'true') return true;
  const perms = session?.user?.permissions;
  return Boolean(perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasAnyAccess);
}
function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sanitizeForPDF(value: string): string {
  return String(value || '')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) return char;
      if ((code >= 128 && code <= 159) || (code >= 160 && code <= 255)) return char;
      return '?';
    })
    .join('')
    .replace(/[^\x00-\xFF]/g, '?');
}
function moneyUSD(cents: number): string {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}
function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
function wrapText(text: string, maxChars: number = 65): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const next = currentLine ? `${currentLine} ${word}` : word;
    if (next.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = next;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
function loadPublicImage(fileName: string): Uint8Array | null {
  try {
    const publicPath = join(process.cwd(), 'public', fileName);
    return new Uint8Array(readFileSync(publicPath));
  } catch {
    return null;
  }
}
async function tryFetchBytes(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}
function drawGradientText(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any,
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number }
): number {
  const chars = Array.from(text);
  let cursorX = x;
  for (let i = 0; i < chars.length; i++) {
    const t = chars.length <= 1 ? 0 : i / (chars.length - 1);
    const color = rgb(
      start.r + (end.r - start.r) * t,
      start.g + (end.g - start.g) * t,
      start.b + (end.b - start.b) * t
    );
    const char = chars[i];
    page.drawText(char, {
      x: cursorX,
      y,
      size,
      font,
      color,
    });
    cursorX += font.widthOfTextAtSize(char, size);
  }
  return cursorX;
}
function beginCircleClip(page: any, centerX: number, centerY: number, radius: number, segments: number = 48): void {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < segments; i++) {
    const t = (Math.PI * 2 * i) / segments;
    points.push({
      x: centerX + radius * Math.cos(t),
      y: centerY + radius * Math.sin(t),
    });
  }
  if (points.length === 0) return;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(points[0].x, points[0].y),
    ...points.slice(1).map((p) => lineTo(p.x, p.y)),
    closePath(),
    clip(),
    endPath()
  );
}
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { subscriptionId } = await params;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }
    const subscription = await (prismaBot as any).donatorSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    const admin = hasAdminAccess(session);
    if (!admin && subscription.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const payment = subscription.payment_id
      ? await (prismaBot as any).razorpayPayment.findFirst({
          where: {
            OR: [
              { razorpay_id: subscription.payment_id },
              { razorpay_order_id: subscription.payment_id },
            ],
          },
        })
      : null;
    const [config, roleName, guildInfo, discordMember] = await Promise.all([
      (prismaBot as any).economyConfig.findUnique({
        where: { guild_id: subscription.guild_id },
        select: { currency_name: true, currency_emoji: true },
      }),
      subscription.plan?.linked_role_id
        ? getGuildRoleName(subscription.guild_id, subscription.plan.linked_role_id)
        : Promise.resolve(null),
      getDiscordGuildInfo(subscription.guild_id),
      getDiscordUser(subscription.user_id),
    ]);
    const userAvatarUrl = discordMember?.user ? getAvatarUrl(discordMember.user, 256) : null;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const width = page.getWidth();
    const height = page.getHeight();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const margin = 42;
    const contentWidth = width - margin * 2;
    const invoiceNo = sanitizeForPDF(String(subscription.id || '').slice(0, 8).toUpperCase());
    const invoiceDate = sanitizeForPDF(formatDate(new Date()).split(',').slice(0, 2).join(','));
    const userName = sanitizeForPDF(
      discordMember?.nick || discordMember?.user?.global_name || discordMember?.user?.username || 'Discord User'
    );
    const userHandle = sanitizeForPDF(discordMember?.user?.username || 'user');
    const serverName = sanitizeForPDF(guildInfo?.name || 'Discord Server');
    const planTitle = sanitizeForPDF(subscription.plan?.title || 'Premium Plan');
    const roleTitle = sanitizeForPDF(roleName || 'Premium Member');
    const statusText = sanitizeForPDF((payment?.status || 'pending').toUpperCase());
    const startDate = sanitizeForPDF(formatDate(subscription.start_date).split(',').slice(0, 2).join(','));
    const expiryDate = sanitizeForPDF(formatDate(subscription.expiry_date).split(',').slice(0, 2).join(','));
    const paymentMethodName = payment?.method === 'ozy' ? 'Ozy Balance' : 'Razorpay';
    const currencyName = config?.currency_name || 'Ozy';
    const amountText = payment
      ? payment.currency === 'OZY'
        ? `${Number(payment.amount || 0).toLocaleString()} ${currencyName}`
        : `${payment.currency || 'INR'} ${(Number(payment.amount || 0) / 100).toFixed(2)}`
      : 'N/A';
    const txnId = sanitizeForPDF(payment?.razorpay_id || subscription.payment_id || 'N/A').slice(0, 48);
    let y = height - 52;
    const titleText = 'OMEGLEE';
    const titleSize = 24;
    const logoSize = 50;
    const logoX = margin;
    const titleX = logoX + logoSize + 14;
    drawGradientText(
      page,
      titleText,
      titleX,
      y,
      titleSize,
      fontBold,
      { r: 0.98, g: 0.56, b: 0.05 },
      { r: 0.05, g: 0.42, b: 0.98 }
    );
    const logoBytes = loadPublicImage('omegle_bg_remvoed.png');
    const logoTopY = y + 10;
    if (logoBytes) {
      try {
        const logo = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logo, {
          x: logoX,
          y: logoTopY - logoSize,
          width: logoSize,
          height: logoSize,
        });
      } catch {
      }
    }
    page.drawText('Premium Donator Receipt', {
      x: titleX,
      y: y - 20,
      size: 12,
      font: fontRegular,
      color: black,
    });
    const avatarBytes = await tryFetchBytes(userAvatarUrl);
    const avatarSize = 52;
    const avatarX = width - margin - avatarSize;
    const avatarTopY = y + 11;
    if (avatarBytes) {
      const centerX = avatarX + avatarSize / 2;
      const centerY = avatarTopY - avatarSize / 2;
      const radius = avatarSize / 2;
      try {
        const avatar = await pdfDoc.embedPng(avatarBytes);
        beginCircleClip(page, centerX, centerY, radius);
        page.drawImage(avatar, {
          x: avatarX,
          y: avatarTopY - avatarSize,
          width: avatarSize,
          height: avatarSize,
        });
        page.pushOperators(popGraphicsState());
      } catch {
        try {
          const avatar = await pdfDoc.embedJpg(avatarBytes);
          beginCircleClip(page, centerX, centerY, radius);
          page.drawImage(avatar, {
            x: avatarX,
            y: avatarTopY - avatarSize,
            width: avatarSize,
            height: avatarSize,
          });
          page.pushOperators(popGraphicsState());
        } catch {
        }
      }
      page.drawCircle({
        x: centerX,
        y: centerY,
        size: radius,
        borderColor: black,
        borderWidth: 0.8,
        color: undefined,
      });
    }
    const rightX = width - margin - 150;
    page.drawText('INVOICE', {
      x: rightX,
      y,
      size: 10,
      font: fontBold,
      color: black,
    });
    page.drawText(invoiceNo, {
      x: rightX,
      y: y - 16,
      size: 12,
      font: fontRegular,
      color: black,
    });
    page.drawText('DATE', {
      x: rightX,
      y: y - 34,
      size: 10,
      font: fontBold,
      color: black,
    });
    page.drawText(invoiceDate, {
      x: rightX,
      y: y - 50,
      size: 11,
      font: fontRegular,
      color: black,
    });
    y -= 84;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: black,
    });
    y -= 24;
    page.drawText('ACCOUNT DETAILS', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: black,
    });
    y -= 14;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: black,
    });
    const leftLabelX = margin;
    const leftValueX = margin + 95;
    const rightLabelX = margin + contentWidth / 2 + 6;
    const rightValueX = rightLabelX + 72;
    const accountRows: Array<[string, string, string, string]> = [
      ['Name', userName, 'Server', serverName],
      ['Handle', `@${userHandle}`, 'Guild ID', sanitizeForPDF(subscription.guild_id || 'N/A')],
      ['Discord ID', sanitizeForPDF(subscription.user_id || 'N/A'), 'Payment', sanitizeForPDF(paymentMethodName)],
    ];
    for (const row of accountRows) {
      y -= 19;
      page.drawText(`${row[0]}:`, { x: leftLabelX, y, size: 10, font: fontBold, color: black });
      page.drawText(row[1], { x: leftValueX, y, size: 10, font: fontRegular, color: black });
      page.drawText(`${row[2]}:`, { x: rightLabelX, y, size: 10, font: fontBold, color: black });
      page.drawText(row[3], { x: rightValueX, y, size: 10, font: fontRegular, color: black });
    }
    y -= 26;
    page.drawText('SUBSCRIPTION SUMMARY', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: black,
    });
    const tableTopY = y - 14;
    const rowHeight = 22;
    const colSplitX = margin + 165;
    const rows: Array<[string, string]> = [
      ['Plan', planTitle],
      ['Role Granted', roleTitle],
      ['Duration', '30 days'],
      ['Status', statusText],
      ['Start Date', startDate],
      ['Expiry Date', expiryDate],
      ['Amount Paid', sanitizeForPDF(amountText)],
      ['USD Value', moneyUSD(subscription.plan?.price || 0)],
      ['Transaction ID', txnId],
    ];
    const tableBottomY = tableTopY - rowHeight * rows.length;
    page.drawLine({ start: { x: margin, y: tableTopY }, end: { x: width - margin, y: tableTopY }, thickness: 1, color: black });
    page.drawLine({ start: { x: margin, y: tableBottomY }, end: { x: width - margin, y: tableBottomY }, thickness: 1, color: black });
    page.drawLine({ start: { x: margin, y: tableTopY }, end: { x: margin, y: tableBottomY }, thickness: 1, color: black });
    page.drawLine({ start: { x: width - margin, y: tableTopY }, end: { x: width - margin, y: tableBottomY }, thickness: 1, color: black });
    page.drawLine({ start: { x: colSplitX, y: tableTopY }, end: { x: colSplitX, y: tableBottomY }, thickness: 1, color: black });
    let rowY = tableTopY;
    for (const [label, value] of rows) {
      rowY -= rowHeight;
      page.drawLine({
        start: { x: margin, y: rowY },
        end: { x: width - margin, y: rowY },
        thickness: 0.8,
        color: black,
      });
      page.drawText(label, {
        x: margin + 8,
        y: rowY + 7,
        size: 10,
        font: fontBold,
        color: black,
      });
      page.drawText(sanitizeForPDF(value), {
        x: colSplitX + 8,
        y: rowY + 7,
        size: 10,
        font: fontRegular,
        color: black,
      });
    }
    y = tableBottomY - 26;
    page.drawText('INCLUDED BENEFITS', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: black,
    });
    y -= 12;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: black,
    });
    const perks: string[] = Array.isArray(subscription.plan?.perks)
      ? subscription.plan.perks.map((p: string) => stripHtml(p)).filter(Boolean).slice(0, 10)
      : [];
    const fallbackBenefit = 'Exclusive community access and premium features in our Discord server';
    const benefitItems = perks.length > 0 ? perks : [fallbackBenefit];
    let benefitY = y - 16;
    for (const perk of benefitItems) {
      const lines = wrapText(sanitizeForPDF(perk), 78);
      for (let i = 0; i < lines.length; i++) {
        if (benefitY < 72) break;
        const prefix = i === 0 ? '- ' : '  ';
        page.drawText(`${prefix}${lines[i]}`, {
          x: margin + 6,
          y: benefitY,
          size: 10,
          font: fontRegular,
          color: black,
        });
        benefitY -= 14;
      }
      if (benefitY < 72) {
        page.drawText('... and more', {
          x: margin + 6,
          y: 58,
          size: 10,
          font: fontRegular,
          color: black,
        });
        break;
      }
      benefitY -= 2;
    }
    page.drawLine({
      start: { x: margin, y: 46 },
      end: { x: width - margin, y: 46 },
      thickness: 1,
      color: black,
    });
    page.drawText('For support: discord.gg/omeglee', {
      x: margin,
      y: 30,
      size: 10,
      font: fontRegular,
      color: black,
    });
    const bytes = await pdfDoc.save();
    const fileName = `omeglee-invoice-${String(subscription.id || '').slice(0, 8)}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}