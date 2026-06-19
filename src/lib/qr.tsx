import { QRCodeSVG } from 'qrcode.react'

/*
 * Thin QR wrapper (TALLY-DESIGN §2 join panel). Renders a high-correction SVG
 * QR sized via the `size` prop. Defaults to dark-on-white so it always scans
 * inside the white quiet-zone card, regardless of the active theme.
 */
export interface QRProps {
  /** The join URL (or any string) to encode. */
  value: string
  /** Edge length in pixels. */
  size: number
  fgColor?: string
  bgColor?: string
  className?: string
}

export function QR({ value, size, fgColor = '#0d0d0f', bgColor = '#ffffff', className }: QRProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      fgColor={fgColor}
      bgColor={bgColor}
      level="M"
      marginSize={0}
      className={className}
    />
  )
}
