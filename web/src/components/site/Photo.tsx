import Image from "next/image";

/**
 * A photograph in a section of the public page at `/`.
 *
 * The draft this page came from hotlinked its images from a Google CDN. These
 * are served from `public/img/` instead: the URLs there expire, and an image we
 * do not host is an image that disappears from the page without warning.
 *
 * `fill` plus a sized parent rather than intrinsic dimensions, because every
 * slot on the page is a fixed-height band and the art is cropped to it.
 */
export function Photo({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
    </div>
  );
}
