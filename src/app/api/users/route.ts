import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const storeId = searchParams.get('storeId');

    const where: any = {};

    // Admin sees all users including inactive; others see only active
    if (user.role !== 'SUPER_ADMIN') where.isActive = true;

    if (user.role === 'REGIONAL_MANAGER') where.regionId = user.regionId;
    else if (user.role === 'STORE_MANAGER') {
        where.storeId = user.storeId;
        where.role = 'EMPLOYEE'; // Store managers only see their sales consultants
    }
    else if (user.role === 'ASSISTANT_MANAGER') where.storeId = user.storeId;

    if (role && user.role !== 'STORE_MANAGER') where.role = role;
    if (storeId) where.storeId = storeId;

    // Sadece /employees sayfası _count ister; query param ile kontrol et
    const withCount = searchParams.get('withCount') === '1';

    const users = await prisma.user.findMany({
        where,
        orderBy: { firstName: 'asc' },
        select: {
            id: true, email: true, firstName: true, lastName: true, role: true,
            hireDate: true, exitDate: true, isActive: true, storeId: true, regionId: true,
            store: { select: { id: true, name: true } },
            region: { select: { id: true, name: true } },
            ...(withCount && {
                _count: {
                    select: {
                        trainingAssignments: true,
                        quizAttempts: true,
                        submittedFeedback: true,
                    },
                },
            }),
        },
    });

    return NextResponse.json(users, {
        headers: { 'Cache-Control': 'private, max-age=15' },
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const bcryptjs = require('bcryptjs');
    const hashedPassword = bcryptjs.hashSync(body.password || 'default123', 10);

    const user = await prisma.user.create({
        data: {
            email: body.email,
            password: hashedPassword,
            firstName: body.firstName,
            lastName: body.lastName,
            role: body.role,
            storeId: body.storeId || null,
            regionId: body.regionId || null,
            hireDate: body.hireDate ? new Date(body.hireDate) : null,
        },
    });

    return NextResponse.json(user, { status: 201 });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const data: any = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.role !== undefined) data.role = body.role;
    if (body.storeId !== undefined) data.storeId = body.storeId || null;
    if (body.regionId !== undefined) data.regionId = body.regionId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.exitDate !== undefined) data.exitDate = body.exitDate ? new Date(body.exitDate) : null;

    const user = await prisma.user.update({
        where: { id: body.id },
        data,
    });

    return NextResponse.json(user);
}

