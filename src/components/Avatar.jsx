import { useDriveImage } from '../lib/images.js'

export default function Avatar({ user, size = 36 }) {
  const src = useDriveImage(user?.avatarId, 'a')
  const initial = (user?.name || user?.display || '?').trim().charAt(0)
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {src ? <img src={src} alt="" width={size} height={size} /> : initial}
    </span>
  )
}
