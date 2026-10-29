import { useState } from 'react'
import { useDriveImage } from '../lib/images.js'

// LINE profile picture first (from the verified login), then the photo in LINE_USERS, then an initial.
export default function Avatar({ user, size = 36 }) {
  const [lineFailed, setLineFailed] = useState(false)
  const useLine = Boolean(user?.picture) && !lineFailed
  const drive = useDriveImage(useLine ? null : user?.avatarId, 'a')
  const src = useLine ? user.picture : drive
  const initial = (user?.name || user?.display || '?').trim().charAt(0)
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => useLine && setLineFailed(true)} />
      ) : (
        initial
      )}
    </span>
  )
}
