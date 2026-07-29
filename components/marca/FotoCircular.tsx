export function FotoCircular({
  src,
  alt,
  className = "h-16 w-16",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`${className} shrink-0 rounded-full border-4 border-white object-cover shadow-soft`}
    />
  );
}
