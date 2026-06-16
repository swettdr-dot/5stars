/** Estrellas de calificación (display): llenas en ámbar, vacías en gris. */
export function StarRating({
  value,
  size = 14,
  gap = 1,
  className = "",
}: {
  value: number;
  size?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap }}
      role="img"
      aria-label={`${value} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= value ? "var(--amber)" : "#E6E6EC"}
          aria-hidden
        >
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}
