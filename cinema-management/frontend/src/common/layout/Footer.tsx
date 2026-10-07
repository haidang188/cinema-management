export interface FooterLink {
    label: string;
    href: string;
}

interface FooterProps {
    links?: FooterLink[];
    version?: string;
}

const DEFAULT_LINKS: FooterLink[] = [
    { label: "Điều khoản sử dụng", href: "#terms" },
    { label: "Chính sách bảo mật", href: "#privacy" },
    { label: "Hỗ trợ kỹ thuật", href: "#support" },
];

function Footer({ links = DEFAULT_LINKS, version }: FooterProps) {
    return (
        <footer className="pl-footer">
            <div className="pl-footer-brand">
                <b>
                    PREMIERE <em>CINEMAS</em>
                </b>
                <span>© {new Date().getFullYear()} Premiere Cinemas. All rights reserved.</span>
            </div>

            <nav className="pl-footer-nav" aria-label="Liên kết cuối trang">
                {links.map((link) => (
                    <a key={link.href} href={link.href}>
                        {link.label}
                    </a>
                ))}

                {version && <span className="pl-footer-version">v{version}</span>}
            </nav>
        </footer>
    );
}

export default Footer;
