export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-rise sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-muted-foreground">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center animate-rise">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
