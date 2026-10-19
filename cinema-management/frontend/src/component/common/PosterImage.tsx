import { useState, type ImgHTMLAttributes } from "react"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "")
const PLACEHOLDER = `${import.meta.env.BASE_URL}poster-placeholder.svg`

export function getPosterSources(value?: string | null): string[] {
  const source = value?.trim()
  if (!source) return [PLACEHOLDER]

  try {
    const url = new URL(source)
    const match = url.pathname.match(/^\/t\/p\/(?:w\d+|original)\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))$/)
    if (url.hostname === "image.tmdb.org" && url.protocol === "https:" && match) {
      return [`${API_BASE_URL}/api/movie-posters/tmdb/${match[1]}`, source, PLACEHOLDER]
    }
  } catch {
    // Relative asset URLs remain supported.
  }
  return [source, PLACEHOLDER]
}

export function posterBackground(value?: string | null): string {
  return getPosterSources(value).map((source) => `url(${JSON.stringify(source)})`).join(", ")
}

type PosterImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & { src?: string | null }

function PosterImageContent({ src, alt = "Poster phim", ...props }: PosterImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const sources = getPosterSources(src)

  return <img {...props} src={sources[sourceIndex]} alt={alt} referrerPolicy="no-referrer"
    onError={() => setSourceIndex((index) => Math.min(index + 1, sources.length - 1))} />
}

export default function PosterImage(props: PosterImageProps) {
  return <PosterImageContent key={props.src} {...props} />
}
