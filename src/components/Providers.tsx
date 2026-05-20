'use client';

import { SessionProvider } from 'next-auth/react';
import ToastProvider from './ui/ToastProvider';
import { NotificationProvider } from './ui/NotificationProvider';
import React from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <NotificationProvider>
                <ToastProvider>{children}</ToastProvider>
            </NotificationProvider>
        </SessionProvider>
    );
}
