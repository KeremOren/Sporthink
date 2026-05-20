import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/health
 *
 * Sağlık kontrol endpoint'i — load balancer, uptime monitor (UptimeRobot,
 * Pingdom, Better Stack, vb.), ve Docker healthcheck için.
 *
 * Status:
 *   200 → Tüm servisler ayakta
 *   503 → Database veya kritik bir servis erişilemez durumda
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const startedAt = Date.now();
    const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

    // Database check
    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (e: any) {
        checks.database = { ok: false, error: e?.message?.substring(0, 100) || 'unknown error' };
    }

    // Gemini API key presence (don't actually call — just check env)
    checks.gemini = {
        ok: !!process.env.GEMINI_API_KEY,
        error: process.env.GEMINI_API_KEY ? undefined : 'GEMINI_API_KEY missing',
    };

    // VAPID keys check
    checks.webPush = {
        ok: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        error: (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
            ? undefined : 'VAPID keys missing',
    };

    const allOk = Object.values(checks).every(c => c.ok);
    const status = allOk ? 'healthy' : 'degraded';
    const httpStatus = checks.database.ok ? 200 : 503; // Sadece DB kritik

    return NextResponse.json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        responseTimeMs: Date.now() - startedAt,
        checks,
    }, { status: httpStatus });
}
