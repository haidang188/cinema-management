function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="home-logo home-logo--footer">
        PREMIERE <span>CINEMAS</span>
      </div>
      <p>© {new Date().getFullYear()} Premiere Cinemas. Bảo lưu mọi quyền.</p>
      <nav aria-label="Liên kết cuối trang">
        <a href="#terms">Điều khoản sử dụng</a>
        <a href="#privacy">Chính sách bảo mật</a>
        <a href="#contact">Liên hệ quảng cáo</a>
      </nav>
    </footer>
  )
}

export default HomeFooter
