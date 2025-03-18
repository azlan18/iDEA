"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  MicIcon as Microphone,
  Video,
  Play,
  Pause,
  CircleStopIcon as Stop,
  Upload,
  CheckCircle,
  AlertCircle,
  Building,
  Headphones,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// API configuration
const API_URL = "http://localhost:5000/api"

export default function RecordQuery() {
  const [recordingType, setRecordingType] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordedBlob, setRecordedBlob] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [transcription, setTranscription] = useState("")
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Retrieve userId from localStorage
  const userId = localStorage.getItem("userId")

  // Cleanup function for streams and URLs
  const cleanup = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedMimeType(null)
    setRecordedChunks([])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [])

  const startRecording = async (type: string) => {
    try {
      setLoading(true)
      setRecordingType(type)
      cleanup()

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      }

      if (type === "video") {
        constraints.video = {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
        }
      }

      console.log("Requesting media with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setMediaStream(stream)

      if (type === "video" && videoRef.current) {
        console.log("Setting up video preview")
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play().catch((e) => {
          console.error("Error playing video preview:", e)
          handleError(e)
        })
      }

      const videoTypes = ["video/webm", "video/mp4"]

      let mimeType
      if (type === "video") {
        mimeType = videoTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm"
        console.log(`Selected video MIME type: ${mimeType}`)
      } else {
        mimeType = "audio/webm;codecs=opus"
      }

      setSelectedMimeType(mimeType)

      const options = {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      }

      if (type === "video") {
        options.videoBitsPerSecond = 2500000 // 2.5 Mbps
      }

      console.log("Creating MediaRecorder with options:", options)
      const recorder = new MediaRecorder(stream, options)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Received data chunk: ${event.data.size} bytes`)
          setRecordedChunks((chunks) => [...chunks, event.data])
        } else {
          console.warn("Received empty data chunk")
        }
      }

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error)
        handleError(event.error)
      }

      const timeslice = type === "audio" ? 1000 : 500 // Increased to 500ms for video
      recorder.start(timeslice)
      console.log(`Started recording with timeslice: ${timeslice}ms`)

      setMediaRecorder(recorder)
      setIsRecording(true)
      setLoading(false)
    } catch (error) {
      console.error("Error starting recording:", error)
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: `Failed to start recording: ${error.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
      cleanup()
      setLoading(false)
    }
  }

  const stopRecording = async () => {
    if (mediaRecorder && isRecording) {
      try {
        console.log("Stopping recording...")
        setLoading(true)

        mediaRecorder.requestData()

        const recordingStopped = new Promise((resolve) => {
          const originalOnStop = mediaRecorder.onstop

          mediaRecorder.onstop = async (event) => {
            if (originalOnStop) {
              originalOnStop.call(mediaRecorder, event)
            }
            console.log("MediaRecorder stopped")
            resolve(true)
          }
        })

        mediaRecorder.stop()
        setIsRecording(false)

        await recordingStopped

        console.log("Processing recorded chunks:", recordedChunks.length)

        if (recordedChunks.length === 0) {
          throw new Error("No data was recorded")
        }

        const chunks = [...recordedChunks]
        const mimeType = recordingType === "video" ? selectedMimeType || "video/webm" : "audio/webm;codecs=opus"

        console.log(`Creating blob with MIME type: ${mimeType}`)
        const blob = new Blob(chunks, { type: mimeType })

        console.log(`Created blob: ${blob.size} bytes, type: ${blob.type}`)

        if (blob.size === 0) {
          throw new Error("Generated blob is empty")
        }

        let file
        if (recordingType === "audio") {
          try {
            console.log("Converting audio to WAV...")
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const arrayBuffer = await blob.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

            const wavBlob = await audioBufferToWav(audioBuffer)
            const fileName = `audio_recording_${new Date().toISOString()}.wav`
            file = new File([wavBlob], fileName, { type: "audio/wav" })

            console.log(`Created WAV file: ${file.size} bytes`)
            setRecordedBlob(file)

            if (previewUrl) {
              URL.revokeObjectURL(previewUrl)
            }

            const url = URL.createObjectURL(wavBlob)
            setPreviewUrl(url)

            if (audioRef.current) {
              audioRef.current.src = url
              audioRef.current.controls = true
            }
          } catch (error) {
            console.error("Error converting audio:", error)
            const fileName = `audio_recording_${new Date().toISOString()}.webm`
            file = new File([blob], fileName, { type: blob.type })

            console.log(`Fallback to WebM file: ${file.size} bytes`)
            setRecordedBlob(file)

            if (previewUrl) {
              URL.revokeObjectURL(previewUrl)
            }

            const url = URL.createObjectURL(blob)
            setPreviewUrl(url)

            if (audioRef.current) {
              audioRef.current.src = url
              audioRef.current.controls = true
            }
          }
        } else {
          const ext = selectedMimeType?.includes("webm") ? "webm" : "mp4"
          const fileName = `video_recording_${new Date().toISOString()}.${ext}`
          file = new File([blob], fileName, { type: selectedMimeType })

          console.log(`Created video file: ${file.size} bytes, type: ${file.type}`)

          if (file.size === 0) {
            throw new Error("Generated video file is empty")
          }

          setRecordedBlob(file)

          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
          }

          const url = URL.createObjectURL(blob)
          console.log("Setting video preview URL:", url)
          setPreviewUrl(url)

          if (videoRef.current) {
            console.log("Setting up video preview")
            videoRef.current.srcObject = null
            videoRef.current.src = url
            videoRef.current.controls = true
            videoRef.current.style.width = "100%"
            videoRef.current.style.maxHeight = "400px"
            videoRef.current.style.backgroundColor = "#000"

            videoRef.current.onloadeddata = () => {
              console.log("Video preview loaded successfully")
              videoRef.current.play().catch((e) => {
                console.error("Error playing video:", e)
                handleError(e)
              })
            }

            videoRef.current.onerror = (e) => {
              console.error("Video preview error:", e)
              handleError(e)
            }
          }
        }

        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        }
        setRecordedChunks([])

        await saveRecording(file)

        setLoading(false)
        console.log("Recording processed successfully")
      } catch (error) {
        console.error("Error stopping recording:", error)
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            text: `Failed to stop recording: ${error.message}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
        setLoading(false)
      }
    }
  }

  const saveRecording = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            text: data.error,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "media",
            text: "Recording saved successfully",
            fileId: data.file_id,
            mediaType: recordingType,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error saving recording:", error)
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: "Error saving recording",
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    }
  }

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const target = e.target as HTMLVideoElement | HTMLAudioElement
    if (target.duration) {
      const progress = (target.currentTime / target.duration) * 100
      setAudioProgress(progress)

      if (target.currentTime >= target.duration) {
        setIsPlaying(false)
      }
    }
  }

  const togglePlayPause = async () => {
    try {
      const isVideoRecording = recordedBlob?.type.startsWith("video/")

      if (isVideoRecording && videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
          setIsPlaying(false)
        } else {
          try {
            await videoRef.current.play()
            setIsPlaying(true)
          } catch (error) {
            handleError(error)
          }
        }
      } else if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause()
          setIsPlaying(false)
        } else {
          try {
            await audioRef.current.play()
            setIsPlaying(true)
          } catch (error) {
            handleError(error)
          }
        }
      }
    } catch (error) {
      handleError(error)
    }
  }

  const handleError = (error: any) => {
    console.error("Media error:", error)

    let errorMessage = "Error playing media file. Please try recording again."

    if (error.message) {
      errorMessage = `Media error: ${error.message}`
    } else if (error.target && error.target.error) {
      const mediaError = error.target.error

      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Playback aborted by the user."
          break
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error occurred while loading the media."
          break
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Media decoding error. The file may be corrupted."
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Media format not supported by your browser."
          break
        default:
          errorMessage = `Media error: ${mediaError.message || "Unknown error"}`
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        type: "error",
        text: errorMessage,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])

    setIsPlaying(false)

    if (recordingType === "video" && videoRef.current) {
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
    } else if (audioRef.current) {
      audioRef.current.removeAttribute("src")
      audioRef.current.load()
    }
  }

  const handleSubmit = async () => {
    const mediaMessage = messages.find((m) => m.type === "media")
    if (!mediaMessage?.fileId) {
      console.error("No file ID found")
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: "No recording found to process",
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
      return
    }

    if (!userId) {
      console.error("No user ID found in localStorage")
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: "Please log in to submit a query",
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
      return
    }

    setLoading(true)
    try {
      console.log("Processing file:", mediaMessage.fileId)
      const response = await fetch(`${API_URL}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          file_id: mediaMessage.fileId,
        }),
      })

      const data = await response.json()
      console.log("Process response:", data)

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            text: data.error,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else {
        if (data.ticket) {
          setMessages((prev) => [
            ...prev,
            {
              type: "success",
              text: `Ticket created: ${data.ticket.ticketId}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
        }

        if (data.processingResults.transcription) {
          setMessages((prev) => [
            ...prev,
            {
              type: "transcription",
              text: data.processingResults.transcription,
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
        }

        if (data.ticket.domain) {
          setMessages((prev) => [
            ...prev,
            {
              type: "department",
              text: `Assigned to: ${data.ticket.domain}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
        }

        setMessages((prev) => [
          ...prev,
          {
            type: "success",
            text: `Query processed successfully (${data.processingResults.sentiment || "N/A"} sentiment)`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error submitting query:", error)
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: "Error submitting query",
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handlePlayMedia = async (fileId: string, mediaType: string) => {
    try {
      console.log(`Playing media: ${fileId}, type: ${mediaType}`)
      setLoading(true)

      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute("src")
        videoRef.current.load()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeAttribute("src")
        audioRef.current.load()
      }
      setIsPlaying(false)

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      const response = await fetch(`${API_URL}/media/${fileId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log(`Received blob: ${blob.size} bytes, type: ${blob.type}`)

      const newBlob = new Blob([blob], {
        type: mediaType === "video" ? "video/mp4" : "audio/wav",
      })
      const url = URL.createObjectURL(newBlob)
      console.log(`Created URL for playback: ${url}`)
      setPreviewUrl(url)

      if (mediaType === "video" && videoRef.current) {
        console.log("Setting up video playback")
        videoRef.current.srcObject = null
        videoRef.current.src = url
        videoRef.current.controls = true
        videoRef.current.style.width = "100%"
        videoRef.current.style.maxHeight = "400px"
        videoRef.current.style.backgroundColor = "#000"

        videoRef.current.onloadeddata = () => {
          console.log("Video loaded successfully")
          setLoading(false)
          videoRef.current.play().catch(handleError)
        }

        videoRef.current.onerror = (e) => {
          console.error("Video error:", e)
          handleError(e)
        }
      } else if (audioRef.current) {
        console.log("Setting up audio playback")
        audioRef.current.src = url
        audioRef.current.controls = true

        audioRef.current.onloadeddata = () => {
          console.log("Audio loaded successfully")
          setLoading(false)
          audioRef.current.play().catch(handleError)
        }

        audioRef.current.onerror = (e) => {
          console.error("Audio error:", e)
          handleError(e)
        }
      }

      setIsPlaying(true)
    } catch (error) {
      console.error("Error playing media:", error)
      handleError(error)
      setLoading(false)
    }
  }

  function audioBufferToWav(audioBuffer: AudioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numOfChannels * bytesPerSample

    const buffer = audioBuffer.getChannelData(0)
    const samples = new Int16Array(buffer.length)

    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    const wavBuffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(wavBuffer)

    writeString(view, 0, "RIFF")
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(view, 8, "WAVE")
    writeString(view, 12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(view, 36, "data")
    view.setUint32(40, samples.length * 2, true)

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true)
    }

    return new Blob([wavBuffer], { type: "audio/wav" })
  }

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // Sub-components
  const MediaPreview = ({
    recordedBlob,
    previewUrl,
    isPlaying,
    audioProgress,
    onTogglePlayPause,
    onTimeUpdate,
    onError,
    loading,
    onSubmit,
    videoRef,
    audioRef,
  }) => {
    const [videoLoaded, setVideoLoaded] = useState(false)
    const isVideo = recordedBlob?.type.startsWith("video/")

    useEffect(() => {
      const currentUrl = previewUrl
      return () => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }
      }
    }, [previewUrl])

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isVideo ? (
              <Video className="h-5 w-5 text-purple-600" />
            ) : (
              <Headphones className="h-5 w-5 text-purple-600" />
            )}
            {isVideo ? "Video Preview" : "Audio Preview"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewUrl && (
            <div className="relative">
              {isVideo ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    className="w-full rounded-md"
                    controls={true}
                    autoPlay={false}
                    playsInline={true}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={() => onTogglePlayPause()}
                    onError={(e) => {
                      console.error("Video preview error:", e)
                      onError(e)
                    }}
                    onLoadedData={() => console.log("Video preview loaded in MediaPreview")}
                    style={{ maxHeight: "400px", objectFit: "contain" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-200 rounded-full h-2 mx-4 mb-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <audio
                    ref={audioRef}
                    src={previewUrl}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={() => onTogglePlayPause()}
                    onError={(e) => {
                      console.error("Audio error:", e)
                      onError(e)
                    }}
                    preload="metadata"
                    className="w-full"
                  />
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            {previewUrl && !isVideo && (
              <Button
                onClick={onTogglePlayPause}
                variant="outline"
                className="flex items-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play</span>
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white ml-auto"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? "Uploading..." : "Submit Query"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const QueryStatus = ({ messages, onPlayMedia }) => {
    const getMessageIcon = (type) => {
      switch (type) {
        case "success":
          return <CheckCircle className="text-green-600" />
        case "error":
          return <AlertCircle className="text-red-600" />
        case "department":
          return <Building className="text-purple-600" />
        case "transcription":
          return <Microphone className="text-purple-600" />
        default:
          return null
      }
    }

    const getMessageStyle = (type) => {
      switch (type) {
        case "success":
          return "bg-green-50 border-green-200 text-green-700"
        case "error":
          return "bg-red-50 border-red-200 text-red-700"
        case "department":
          return "bg-purple-50 border-purple-200 text-purple-700"
        case "transcription":
          return "bg-purple-50 border-purple-200 text-purple-700"
        case "media":
          return "bg-slate-50 border-slate-200 text-slate-700"
        default:
          return "bg-slate-50 border-slate-200 text-slate-700"
      }
    }

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Query Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 h-[calc(100%-80px)] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border flex items-start gap-3 ${getMessageStyle(message.type)}`}
            >
              <div className="flex-shrink-0 mt-1">{getMessageIcon(message.type)}</div>
              <div className="flex-1">
                <p className="text-sm">{message.text}</p>
                <p className="text-xs text-slate-500 mt-1">{message.timestamp}</p>
              </div>
              {message.type === "media" && (
                <button
                  onClick={() => onPlayMedia(message.fileId, message.mediaType)}
                  className="flex-shrink-0 text-purple-600 hover:text-purple-700"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          {messages.length === 0 && <p className="text-slate-500 text-center py-4">No messages yet</p>}
        </CardContent>
      </Card>
    )
  }

  const RecordingButtons = ({ onStartRecording, loading }) => {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Start Recording</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[calc(100%-80px)] justify-center">
          <div className="grid grid-cols-2 gap-6">
            <Button
              onClick={() => onStartRecording("audio")}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-6"
            >
              <Microphone className="w-5 h-5" />
              <span className="text-lg font-medium">Record Audio</span>
            </Button>

            <Button
              onClick={() => onStartRecording("video")}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-6"
            >
              <Video className="w-5 h-5" />
              <span className="text-lg font-medium">Record Video</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const RecordingControls = ({ recordingType, onStopRecording, loading, videoRef, stream }) => {
    useEffect(() => {
      if (recordingType === "video" && videoRef.current && stream) {
        console.log("Setting up video stream")
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((e) => console.error("Error playing video:", e))
      }
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null // Cleanup
        }
      }
    }, [recordingType, stream])

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {recordingType === "video" ? (
              <Video className="h-5 w-5 text-purple-600" />
            ) : (
              <Microphone className="h-5 w-5 text-purple-600" />
            )}
            {recordingType === "video" ? "Video Recording" : "Audio Recording"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordingType === "video" && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-md"
                style={{
                  height: "300px",
                  objectFit: "cover",
                  transform: "translateZ(0)", // Forces hardware acceleration
                  willChange: "transform", // Optimizes rendering
                }}
              />
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Recording</span>
                </div>
              </div>
            </div>
          )}

          {recordingType === "audio" && (
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center">
                  <Microphone className="h-12 w-12 text-purple-600" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span>Recording</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={onStopRecording}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4"
          >
            <Stop className="w-5 h-5" />
            <span className="text-lg font-medium">Stop Recording</span>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-[1200px] mx-auto px-6">
        <header className="flex items-center justify-between mb-8 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src="https://play-lh.googleusercontent.com/mlL6e-9TQL_vIcOt79KCDzArLc_hyWJYKDGKKP2bwGe0q3EJS0HRFJuz41d2n-Xvng"
              alt="Vyom Logo"
              className="h-12 w-12 rounded-md"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=48&width=48"
              }}
            />
            <h1 className="text-2xl font-bold text-gray-800">Voice & Video Query System</h1>
          </div>
          <Avatar>
            <AvatarFallback className="bg-purple-600 text-white">
              {userData?.firstName?.[0] || "V"}
              {userData?.lastName?.[0] || "Y"}
            </AvatarFallback>
          </Avatar>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
          <div className="lg:col-span-2 flex flex-col h-full">
            {!isRecording && !recordedBlob && <RecordingButtons onStartRecording={startRecording} loading={loading} />}

            {isRecording && (
              <RecordingControls
                recordingType={recordingType}
                onStopRecording={stopRecording}
                loading={loading}
                videoRef={videoRef}
                stream={mediaStream}
              />
            )}

            {recordedBlob && (
              <MediaPreview
                recordedBlob={recordedBlob}
                previewUrl={previewUrl}
                isPlaying={isPlaying}
                audioProgress={audioProgress}
                onTogglePlayPause={togglePlayPause}
                onTimeUpdate={handleTimeUpdate}
                onError={handleError}
                loading={loading}
                onSubmit={handleSubmit}
                videoRef={videoRef}
                audioRef={audioRef}
              />
            )}
          </div>

          <div className="h-full">
            <QueryStatus messages={messages} onPlayMedia={handlePlayMedia} />
          </div>
        </div>
      </div>
    </div>
  )
}

function audioBufferToWav(audioBuffer: AudioBuffer) {
  const numOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numOfChannels * bytesPerSample

  const buffer = audioBuffer.getChannelData(0)
  const samples = new Int16Array(buffer.length)

  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]))
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const wavBuffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(wavBuffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, "data")
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true)
  }

  return new Blob([wavBuffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}