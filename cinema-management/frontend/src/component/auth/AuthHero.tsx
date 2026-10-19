import { Armchair, Clapperboard, TicketPercent } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHomeMovies } from '../../service/movie/movieService'

const FEATURES = [
  { icon: <Clapperboard size={15} />, title: 'Lịch chiếu cập nhật', text: 'Xem suất chiếu theo ngày, theo định dạng.' },
  { icon: <Armchair size={15} />, title: 'Chọn ghế trực quan', text: 'Thấy ngay ghế trống trên sơ đồ phòng.' },
  { icon: <TicketPercent size={15} />, title: 'Ưu đãi thành viên', text: 'Áp mã giảm giá ngay khi đặt vé.' },
]

function AuthHero() {
  const [posters, setPosters] = useState<string[]>([])

  useEffect(() => {
    getHomeMovies()
      .then((movies) => setPosters(movies.map((movie) => movie.posterUrl).filter(Boolean).slice(0, 12)))
      .catch(() => setPosters([]))
  }, [])

  return (
    <section className="au-hero">
      {posters.length > 0 && (
        <div className="au-posters" aria-hidden="true">
          {[...posters, ...posters].slice(0, 12).map((url, index) => (
            <img key={index} src={url} alt="" loading="lazy" />
          ))}
        </div>
      )}

      <div className="au-hero-copy">
        <span className="au-eyebrow">Premiere Cinemas</span>
        <h1>Đặt vé nhanh,<br />chọn ghế đẹp.</h1>
        <p>Tài khoản thành viên giúp bạn đặt vé online, lưu lịch sử và nhận ưu đãi riêng.</p>

        <ul className="au-features">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <span>{feature.icon}</span>
              <div>
                <strong>{feature.title}</strong>
                <small>{feature.text}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default AuthHero
