'use client';

export function SkeletonCard({ count = 1 }: { count?: number }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card skeleton-card">
                    <div className="skeleton skeleton-line" style={{ width: '40%', height: 14 }} />
                    <div className="skeleton skeleton-line" style={{ width: '80%', height: 20, marginTop: 12 }} />
                    <div className="skeleton skeleton-line" style={{ width: '100%', height: 14, marginTop: 8 }} />
                    <div className="skeleton skeleton-line" style={{ width: '60%', height: 14, marginTop: 8 }} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}><div className="skeleton skeleton-line" style={{ width: 80, height: 12 }} /></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c}><div className="skeleton skeleton-line" style={{ width: c === 0 ? 140 : 80, height: 14 }} /></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
    return (
        <div className="stat-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="stat-card">
                    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)' }} />
                    <div className="stat-info">
                        <div className="skeleton skeleton-line" style={{ width: 60, height: 28, marginBottom: 6 }} />
                        <div className="skeleton skeleton-line" style={{ width: 90, height: 12 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonKanban({ columns = 5 }: { columns?: number }) {
    return (
        <div className="kanban-board">
            {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="kanban-column">
                    <div className="kanban-column-header">
                        <div className="skeleton skeleton-line" style={{ width: 100, height: 14 }} />
                        <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)' }} />
                    </div>
                    <div className="kanban-column-body">
                        {Array.from({ length: 2 }).map((_, j) => (
                            <div key={j} className="kanban-card">
                                <div className="skeleton skeleton-line" style={{ width: '50%', height: 12 }} />
                                <div className="skeleton skeleton-line" style={{ width: '80%', height: 14, marginTop: 8 }} />
                                <div className="skeleton skeleton-line" style={{ width: '40%', height: 12, marginTop: 6 }} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
