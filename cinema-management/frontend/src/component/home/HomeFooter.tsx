import Footer from "../../common/layout/Footer"

const customerLinks = [
  { label: "Điều khoản sử dụng", href: "#terms" },
  { label: "Chính sách bảo mật", href: "#privacy" },
  { label: "Liên hệ quảng cáo", href: "#contact" },
]

export default function HomeFooter() {
  return (
    <div className="home-footer shell-customer-footer">
      <Footer links={customerLinks} />
    </div>
  )
}