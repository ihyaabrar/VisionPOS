import { useEffect, RefObject } from 'react'
import { Detection } from '../../types'

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
]

interface DetectionOverlayProps {
  detections: Detection[]
  videoWidth: number
  videoHeight: number
  canvasRef?: RefObject<HTMLCanvasElement>
}

export default function DetectionOverlay({
  detections,
  videoWidth,
  videoHeight,
  canvasRef,
}: DetectionOverlayProps) {
  useEffect(() => {
    const canvas = canvasRef?.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    detections.forEach((det) => {
      const color = COLORS[det.classId % COLORS.length]
      const [x1, y1, x2, y2] = det.bbox
      const w = x2 - x1
      const h = y2 - y1

      // Bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x1, y1, w, h)

      // Label background
      const label = `${det.itemName} (${Math.round(det.confidence * 100)}%)`
      ctx.font = '13px sans-serif'
      const textWidth = ctx.measureText(label).width
      const labelH = 18

      ctx.fillStyle = color
      ctx.fillRect(x1, y1 - labelH, textWidth + 8, labelH)

      // Label text
      ctx.fillStyle = '#fff'
      ctx.fillText(label, x1 + 4, y1 - 4)
    })
  }, [detections, canvasRef])

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
