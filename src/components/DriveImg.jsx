import { useRef, useState } from 'react'
import { useDriveImage, useNearViewport } from '../lib/images.js'

export const ratio = (e) => (e.width && e.height ? `${e.width} / ${e.height}` : '4 / 5')
export const ratioNum = (e) => (e.width && e.height ? e.width / e.height : 0.8)

// Shows the small proxied image right away and swaps to the large one when `size="l"` arrives.
// Small images only start loading once they are near the viewport.
export default function DriveImg({ id, size = 's', alt = '', onReady, eager = false, ...rest }) {
  const ref = useRef(null)
  const near = useNearViewport(ref, eager || size === 'l')
  const small = useDriveImage(id, 's', near)
  const large = useDriveImage(size === 'l' ? id : null, 'l', near)
  const src = (size === 'l' && large) || small
  const [shown, setShown] = useState(null)
  return (
    <img
      ref={ref}
      src={src || undefined}
      alt={alt}
      decoding="async"
      data-ready={shown === src && src ? '' : undefined}
      onLoad={() => {
        setShown(src)
        onReady?.()
      }}
      {...rest}
    />
  )
}
