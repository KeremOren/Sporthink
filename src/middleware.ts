import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: {
        signIn: '/login',
    },
});

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/trainings/:path*',
        '/quizzes/:path*',
        '/employees/:path*',
        '/kpi/:path*',
        '/feedback/:path*',
        '/reports/:path*',
        '/analytics/:path*',
        '/audit/:path*',
        '/admin/:path*',
        '/profile/:path*',
    ],
};
