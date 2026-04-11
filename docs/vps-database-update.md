# VPS database and environment update

This project uses:
- MongoDB via `MONGODB_URI`
- PostgreSQL via `BOT_DATABASE_URL` and `BOT_DATABASE_WRITE_URL`
- Prisma on top of PostgreSQL

## 1) VPS details (from your instance)
- Instance ID: `i-0c49d3b3840111816`
- Public IP: `34.233.119.83`
- Public DNS: `ec2-34-233-119-83.compute-1.amazonaws.com`
- Private IP: `172.31.28.36`

## 2) Which DB host to use
- If Next.js app and PostgreSQL are on the same VPS: use `127.0.0.1` (recommended)
- If app runs from another machine: use `34.233.119.83` or `ec2-34-233-119-83.compute-1.amazonaws.com`

## 3) Required env values to update on VPS
Set these in your VPS env file (example: `.env.local`):

```env
NEXTAUTH_URL=http://34.233.119.83:3000
# Or if domain is configured:
# NEXTAUTH_URL=https://your-domain.com

BOT_DATABASE_URL=postgresql://postgres:<PASSWORD>@127.0.0.1:5432/Omegle-BOT
BOT_DATABASE_WRITE_URL=postgresql://postgres:<PASSWORD>@127.0.0.1:5432/Omegle-BOT

# Keep your existing Mongo URL if already working
MONGODB_URI=<your_mongodb_uri>
```

If app is NOT on the same VPS, use this host instead:

```env
BOT_DATABASE_URL=postgresql://postgres:<PASSWORD>@34.233.119.83:5432/Omegle-BOT
BOT_DATABASE_WRITE_URL=postgresql://postgres:<PASSWORD>@34.233.119.83:5432/Omegle-BOT
```

## 4) Open required ports
- `3000` for Next.js (web app)
- `5432` for PostgreSQL (only if external access needed)

For security, keep `5432` restricted to trusted IPs if possible.

## 5) Validate DB status after update
From project root:

```bash
npm run check:databases
```

Expected output ends with:

```text
All database checks passed.
```

## 6) Restart app on VPS
If using PM2:

```bash
pm2 restart all
pm2 logs --lines 100
```

If using plain Node:

```bash
npm run build
npm run start
```
