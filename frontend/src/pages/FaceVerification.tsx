"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { AlertCircle, Camera, Loader2, Check, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const FaceVerification: React.FC = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "loading" | "success" | "failed">("idle")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [threshold, setThreshold] = useState<number | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")

    if (!storedUserId) {
      navigate("/login")
      return
    }

    setUserId(storedUserId)

    // Start the camera automatically when userId is set
    startCamera()
  }, [navigate])

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await new Promise((resolve) => setTimeout(resolve, 500)) // Small delay to ensure video starts
        videoRef.current.play() // Ensure video starts playing
      }

      setStream(mediaStream)
      setCameraActive(true)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Unable to access camera. Please check your permissions and try again.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setCameraActive(false)
    }
  }

  const fetchReferenceImage = async () => {
    try {
      if (!userId) return null

      const response = await axios.get(`http://localhost:5000/api/users/face/${userId}`)
      setReferenceImage(response.data.faceImage)
      return response.data.faceImage
    } catch (err) {
      console.error("Error fetching reference image:", err)
      setError("Failed to fetch your reference image. Please try again.")
      return null
    }
  }

  const beginVerification = async () => {
    setVerificationStatus("loading")
    setLoading(true)
    setError("")

    try {
      const faceImage = await fetchReferenceImage()

      if (!faceImage) {
        setVerificationStatus("failed")
        setLoading(false)
        return
      }

      await startCamera()
      setLoading(false)
    } catch (err) {
      console.error("Error starting verification:", err)
      setError("Failed to start verification. Please try again.")
      setVerificationStatus("failed")
      setLoading(false)
    }
  }

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !referenceImage) {
      setError("Camera or reference image not available.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

        const capturedImage = canvasRef.current.toDataURL("image/jpeg")

        const response = await axios.post("http://localhost:5005/api/verify", {
          image: capturedImage,
          referenceImage: referenceImage,
        })

        // Set match score and threshold
        if (response.data.distance !== undefined) {
          setMatchScore((1 - response.data.distance) * 100)
        }
        if (response.data.threshold !== undefined) {
          setThreshold((1 - response.data.threshold) * 100)
        }

        if (response.data.verified) {
          setVerificationStatus("success")
          setTimeout(() => {
            navigate("/dashboard")
          }, 2000)
        } else {
          setVerificationStatus("failed")
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(err.response?.data?.message || "Face verification failed. Please try again.")
      setVerificationStatus("failed")
    } finally {
      setLoading(false)
      stopCamera()
    }
  }

  // Render verification status with percentage
  const renderVerificationStatus = () => {
    if (verificationStatus === "loading" || loading) {
      return (
        <div className="text-center text-gray-600 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying your identity...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-red-50 p-3 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 font-medium">Authentication Error</p>
          </div>
          <p className="text-red-500 text-sm ml-7">{error}</p>
        </div>
      )
    }

    if (verificationStatus === "success" && matchScore !== null) {
      const matchScoreFixed = matchScore.toFixed(1)
      const thresholdScore = threshold !== null ? threshold.toFixed(1) : "0"

      return (
        <div className="bg-green-50 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-700">Authentication Successful</p>
            </div>
            <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Match Score</span>
              <span className="text-green-700">{matchScoreFixed}%</span>
            </div>

            <div className="w-full bg-green-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-green-600"
                style={{ width: `${Math.max(5, Number.parseFloat(matchScoreFixed))}%` }}
              ></div>
            </div>

            <div className="text-xs text-gray-500 mt-1">Threshold: {thresholdScore}%</div>
          </div>
        </div>
      )
    }

    if (verificationStatus === "failed" && matchScore !== null) {
      const matchScoreFixed = matchScore.toFixed(1)
      const thresholdScore = threshold !== null ? threshold.toFixed(1) : "0"

      return (
        <div className="bg-red-50 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="font-medium text-red-700">Authentication Failed</p>
            </div>
            <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Match Score</span>
              <span className="text-red-700">{matchScoreFixed}%</span>
            </div>

            <div className="w-full bg-red-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-red-600"
                style={{ width: `${Math.max(5, Number.parseFloat(matchScoreFixed))}%` }}
              ></div>
            </div>

            <div className="text-xs text-gray-500 mt-1">Threshold: {thresholdScore}%</div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-lg shadow-md">
          <div className="bg-gradient-to-r from-blue-600 to-red-600 text-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Vyom Auth</h2>
                <p className="text-white/80">Secure Facial Authentication</p>
              </div>
              <div className="bg-white p-2 rounded-full">
                <Camera className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-4 pt-6 bg-white">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {verificationStatus === "idle" ? (
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-blue-100 p-6 mb-4">
                  <Camera className="h-10 w-10 text-blue-600" />
                </div>
                <p className="text-center mb-4">Please position your face in front of the camera for verification</p>
                <Button onClick={beginVerification} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    "Begin Verification"
                  )}
                </Button>
              </div>
            ) : cameraActive ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-4 rounded-lg overflow-hidden border-2 border-gray-200">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />

                  {loading && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                      <div className="h-12 w-12 border-b-2 border-white rounded-full animate-spin"></div>
                    </div>
                  )}

                  {verificationStatus === "success" && !loading && (
                    <div className="absolute bottom-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Verified
                    </div>
                  )}
                </div>

                <div className="w-full mt-4">{renderVerificationStatus()}</div>

                <Button
                  onClick={captureAndVerify}
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify Now"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {renderVerificationStatus()}

                {verificationStatus === "failed" && (
                  <Button
                    onClick={() => setVerificationStatus("idle")}
                    className="mt-4 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white"
                  >
                    Try Again
                  </Button>
                )}

                {verificationStatus === "success" && (
                  <div className="flex flex-col items-center text-center mt-4">
                    <Check className="h-8 w-8 text-green-600" />
                    <p className="text-lg font-medium text-green-600 mt-2">Verification successful!</p>
                    <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
                  </div>
                )}
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
          </div>

          <div className="p-4 bg-gray-50">
            <p className="text-sm text-gray-500 text-center">
              Having trouble?{" "}
              <a href="/login" className="text-blue-600 hover:underline">
                Return to login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FaceVerification

