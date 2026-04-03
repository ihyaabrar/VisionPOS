import { useEffect, useRef } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { Detection } from '../../types'
import DetectionOverlay from './DetectionOverlay'

interface CameraFeedProps {
  onFrame?: (base64: string) => void
  detections?: Detection[]
  width?: number
  height?: number
}

export default function CameraFeed({
  onFrame,
  detections = [],
  width = 640,
  height = 360,
}: CameraFeedProps) {
  const { videoRef, canvasRef, isActive, error, startCamera, stopCamera, captureFrame } =
    useCamera()

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Frame capture interval
  useEffect(() => {
    if (isActive && onFrame) {
      intervalRef.current = setInterval(() => {
        const frame = captureFrame()
        if (frame) onFrame(frame)
      }, 66)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, onFrame, captureFrame])

  return (
    <div className="camera-feed" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Video + overlay container */}
      <div
        style={{
          position: 'relative',
          width,
          height,
          background: '#111',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          width={width}
          height={height}
          muted
          playsInline
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Detection overlay canvas */}
        {isActive && detections.length > 0 && (
          <DetectionOverlay
            detections={detections}
            videoWidth={width}
            videoHeight={height}
            canvasRef={overlayCanvasRef}
          />
        )}

        {/* Status overlay */}
        {!isActive && !error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#aaa',
              fontSize: 14,
            }}
          >
            Kamera tidak aktif
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)',
              color: '#f87171',
              fontSize: 13,
              padding: 16,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Status + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 12,
            background: isActive ? '#16a34a' : error ? '#dc2626' : '#6b7280',
            color: '#fff',
          }}
        >
          {isActive ? 'Aktif' : error ? 'Error' : 'Tidak Aktif'}
        </span>

        {!isActive ? (
          <button
            onClick={startCamera}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Mulai Kamera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Stop Kamera
          </button>
        )}
      </div>
    </div>
  )
}
