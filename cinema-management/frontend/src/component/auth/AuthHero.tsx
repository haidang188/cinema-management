interface AuthHeroProps {
  compact?: boolean
}

function AuthHero({ compact = false }: AuthHeroProps) {
  return (
    <section className={`auth-hero ${compact ? 'auth-hero--compact' : ''}`}>
      <div className="brand-mark">PREMIERE</div>
      <div className="hero-copy">
        <p className="hero-kicker">Cinema Management</p>
        <h1>Trải nghiệm điện ảnh đỉnh cao.</h1>
        <p>
          Hệ thống quản lý rạp chiếu phim chuyên nghiệp, tối ưu hóa quy trình
          đặt vé, lịch chiếu và kiểm soát vận hành.
        </p>
      </div>
    </section>
  )
}

export default AuthHero
