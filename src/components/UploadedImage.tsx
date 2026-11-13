import type { ComponentProps } from 'react'

/**
 * A plain <img> for files admins and participants upload (covers, gallery photos).
 * They're written to disk at runtime and served by the /uploads route, with unknown
 * dimensions, so next/image's resizing and fixed sizes don't fit; the pages lay them
 * out with object-cover instead.
 */
export default function UploadedImage({ alt, ...props }: ComponentProps<'img'> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- see the comment above
  return <img alt={alt} {...props} />
}
