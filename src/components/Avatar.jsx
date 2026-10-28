export default function Avatar({ user, size = 36 }) {
  const initial = (user?.name || '?').trim().charAt(0)
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {user?.avatar ? <img src={user.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer" /> : initial}
    </span>
  )
}
