import { useState } from 'react'
import { useDriveImage } from '../lib/images.js'

export const ratio = (e) => (e.width && e.height ? `${e.width} / ${e.height}` : '4 / 5')
export const ratioNum = (e) => (e.width && e.height ? e.width / e.height : 0.8)

// Shows the small proxied image right away and swaps to the large one when `size="l"` arrives.
export default function DriveImg({ id, size = 's', alt = '', onReady, ...rest }) {
  const small = useDriveImage(id, 's')
  const large = useDriveImage(size === 'l' ? id : null, 'l')
  const src = (size === 'l' && large) || small
  const [shown, setShown] = useState(null)
  return (
    <img
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
