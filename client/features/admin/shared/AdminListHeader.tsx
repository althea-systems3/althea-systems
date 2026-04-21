type AdminListHeaderProps = {
  title: string
  description?: string
  titleId?: string
}

export function AdminListHeader({
  title,
  description,
  titleId,
}: AdminListHeaderProps) {
  return (
    <header className="space-y-1">
      <h1
        id={titleId}
        className="heading-font text-2xl text-brand-nav sm:text-3xl"
      >
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-slate-600 sm:text-base">{description}</p>
      ) : null}
    </header>
  )
}
