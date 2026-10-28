const HEIGHTS = [320, 240, 280, 360, 220, 300, 260, 340]

export function GallerySkeleton({ count = 8 }) {
  return (
    <div className="gallery" aria-busy="true" aria-label="กำลังโหลดผลงาน">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card card-skeleton">
          <div className="shimmer" style={{ height: HEIGHTS[i % HEIGHTS.length] }} />
          <div className="card-meta">
            <span className="shimmer line" style={{ width: '70%' }} />
            <span className="shimmer line sm" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
