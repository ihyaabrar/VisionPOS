import { useRef, useState, useCallback, RefObject } from 'react'
import { useCameraStore } from '../store/cameraStore'

interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  isActive: boolean
  error: string | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureFrame: () => string | null
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { setActive, setError: storeSetError } = useCameraStore()

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      storeSetError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsActive(true)
      setActive(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Kamera tidak tersedia'
      const errorMsg = `Gagal mengakses kamera: ${message}`
      setError(errorMsg)
      storeSetError(errorMsg)
      setIsActive(false)
      setActive(false)
    }
  }, [setActive, storeSetError])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsActive(false)
    setActive(false)
  }, [setActive])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !isActive) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [isActive])

  return {
    videoRef,
    canvasRef,
    isActive,
    error,
    startCamera,
    stopCamera,
    captureFrame,
  }
}
