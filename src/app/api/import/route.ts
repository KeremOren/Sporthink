import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Sadece Super Admin toplu veri yükleyebilir' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('type') as string;

    if (!file || !importType) {
        return NextResponse.json({ error: 'Dosya ve tür gerekli' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
        return NextResponse.json({ error: 'Dosyada veri bulunamadı' }, { status: 400 });
    }

    const results = { success: 0, errors: [] as string[], total: rows.length };

    try {
        if (importType === 'users') {
            // Expected columns: email, firstName, lastName, role, storeName, password
            const stores = await prisma.store.findMany({ include: { region: true } });
            const storeMap = new Map(stores.map(s => [s.name.toLowerCase(), s]));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2; // Excel rows start at 1 + header
                try {
                    if (!row.email || !row.firstName || !row.lastName) {
                        results.errors.push(`Satır ${rowNum}: email, firstName, lastName zorunlu`);
                        continue;
                    }

                    // Check duplicate
                    const existing = await prisma.user.findUnique({ where: { email: row.email } });
                    if (existing) {
                        results.errors.push(`Satır ${rowNum}: ${row.email} zaten mevcut`);
                        continue;
                    }

                    const role = (row.role || 'EMPLOYEE').toUpperCase();
                    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'].includes(role)) {
                        results.errors.push(`Satır ${rowNum}: Geçersiz rol "${row.role}"`);
                        continue;
                    }

                    const store = row.storeName ? storeMap.get(row.storeName.toLowerCase()) : null;
                    const password = hashPassword(row.password || 'sporthink123');

                    await prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email: row.email,
                            password,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            role,
                            storeId: store?.id || null,
                            regionId: store?.regionId || null,
                            hireDate: row.hireDate ? new Date(row.hireDate) : null,
                        },
                    });
                    results.success++;
                } catch (err: any) {
                    results.errors.push(`Satır ${rowNum}: ${err.message?.slice(0, 100)}`);
                }
            }
        } else if (importType === 'kpi') {
            // Expected columns: storeName, kpiName, period, value, notes
            const stores = await prisma.store.findMany();
            const storeMap = new Map(stores.map(s => [s.name.toLowerCase(), s]));
            const kpiDefs = await prisma.kpiDefinition.findMany();
            const kpiMap = new Map(kpiDefs.map(k => [k.name.toLowerCase(), k]));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2;
                try {
                    if (!row.storeName || !row.kpiName || !row.period || row.value === undefined) {
                        results.errors.push(`Satır ${rowNum}: storeName, kpiName, period, value zorunlu`);
                        continue;
                    }

                    const store = storeMap.get(row.storeName.toLowerCase());
                    if (!store) {
                        results.errors.push(`Satır ${rowNum}: Mağaza bulunamadı "${row.storeName}"`);
                        continue;
                    }

                    const kpiDef = kpiMap.get(row.kpiName.toLowerCase());
                    if (!kpiDef) {
                        results.errors.push(`Satır ${rowNum}: KPI tanımı bulunamadı "${row.kpiName}"`);
                        continue;
                    }

                    await prisma.kpiEntry.create({
                        data: {
                            id: uuidv4(),
                            kpiDefinitionId: kpiDef.id,
                            storeId: store.id,
                            period: row.period,
                            value: parseFloat(row.value),
                            notes: row.notes || null,
                            enteredById: user.id,
                        },
                    });
                    results.success++;
                } catch (err: any) {
                    results.errors.push(`Satır ${rowNum}: ${err.message?.slice(0, 100)}`);
                }
            }
        } else if (importType === 'trainings') {
            // Expected columns: title, description, category, type (MANDATORY/OPTIONAL), durationMinutes
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2;
                try {
                    if (!row.title) {
                        results.errors.push(`Satır ${rowNum}: title zorunlu`);
                        continue;
                    }

                    await prisma.training.create({
                        data: {
                            id: uuidv4(),
                            title: row.title,
                            description: row.description || '',
                            category: row.category || 'Genel',
                            type: (row.type || 'OPTIONAL').toUpperCase(),
                            durationMinutes: parseInt(row.durationMinutes) || 30,
                            createdById: user.id,
                        },
                    });
                    results.success++;
                } catch (err: any) {
                    results.errors.push(`Satır ${rowNum}: ${err.message?.slice(0, 100)}`);
                }
            }
        } else {
            return NextResponse.json({ error: `Geçersiz import türü: ${importType}` }, { status: 400 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: `Genel hata: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json(results);
}

// GET: Download template
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get('template');

    let data: any[] = [];
    let filename = 'template.xlsx';

    if (templateType === 'users') {
        data = [
            { email: 'ornek@sporthink.com', firstName: 'Ahmet', lastName: 'Yılmaz', role: 'EMPLOYEE', storeName: 'İzmir Karşıyaka', password: 'sifre123', hireDate: '2024-01-15' },
            { email: 'ornek2@sporthink.com', firstName: 'Ayşe', lastName: 'Kaya', role: 'ASSISTANT_MANAGER', storeName: 'İstanbul Kadıköy', password: 'sifre123', hireDate: '2024-03-01' },
        ];
        filename = 'kullanici_sablonu.xlsx';
    } else if (templateType === 'kpi') {
        data = [
            { storeName: 'İzmir Karşıyaka', kpiName: 'Aylık Satış Hedefi', period: '2026-03', value: 520000, notes: '' },
            { storeName: 'İzmir Karşıyaka', kpiName: 'Müşteri Memnuniyeti', period: '2026-03', value: 87, notes: '' },
            { storeName: 'İstanbul Kadıköy', kpiName: 'Ürün Satış Adedi', period: '2026-03', value: 950, notes: 'Kampanya etkisi' },
        ];
        filename = 'kpi_sablonu.xlsx';
    } else if (templateType === 'trainings') {
        data = [
            { title: 'Örnek Eğitim', description: 'Eğitim açıklaması', category: 'Satış', type: 'MANDATORY', durationMinutes: 45 },
        ];
        filename = 'egitim_sablonu.xlsx';
    } else {
        return NextResponse.json({ error: 'Geçersiz şablon türü' }, { status: 400 });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Veri');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
