"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, CheckCircle2, Camera, User, ArrowRight, Shield, MapPin, Phone, Mail, KeyRound } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

const Login: React.FC = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [activeTab, setActiveTab] = useState("login")
  const [currentStep, setCurrentStep] = useState(1)
  const [progress, setProgress] = useState(20)

  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    email: "",
    password: "",
  })

  // Registration form state
  const [registerFormData, setRegisterFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    faceImage: "",
    aadhaarPhoneNumber: "",
    panPhoneNumber: "",
    aadhaarOtp: "",
    panOtp: "",
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [aadhaarData, setAadhaarData] = useState<any>(null)
  const [panData, setPanData] = useState<any>(null)
  const [aadhaarVerified, setAadhaarVerified] = useState(false)
  const [panVerified, setPanVerified] = useState(false)
  const [aadhaarOtpVerified, setAadhaarOtpVerified] = useState(false)
  const [panOtpVerified, setPanOtpVerified] = useState(false)

  // Handle login form change
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginFormData({
      ...loginFormData,
      [e.target.name]: e.target.value,
    })
  }

  // Handle registration form change
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterFormData({
      ...registerFormData,
      [e.target.name]: e.target.value,
    })
  }

  // Handle login form submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Step 1: Login and get user data
      const response = await axios.post("http://localhost:5000/api/users/login", {
        email: loginFormData.email,
        password: loginFormData.password,
      })

      // Save basic user data to localStorage
      localStorage.setItem("userId", response.data._id)
      localStorage.setItem("token", response.data.token)
      localStorage.setItem("userEmail", response.data.email)
      localStorage.setItem("userFirstName", response.data.firstName)
      localStorage.setItem("userLastName", response.data.lastName)
      localStorage.setItem("userPhoneNumber", response.data.phoneNumber)
      localStorage.setItem("userVerified", response.data.verified)

      // Step 2: Fetch Aadhaar data using the phone number from login response
      try {
        console.log("Fetching Aadhaar data with phone number:", response.data.phoneNumber)
        const aadhaarResponse = await axios.get(`http://localhost:5000/api/users/aadhaar/${response.data.phoneNumber}`)

        if (aadhaarResponse.data) {
          console.log("Aadhaar data received:", aadhaarResponse.data)
          localStorage.setItem("aadhaarData", JSON.stringify(aadhaarResponse.data))
        }
      } catch (aadhaarErr) {
        console.error("Error fetching Aadhaar data:", aadhaarErr)
        // Don't block login if Aadhaar fetch fails
      }

      // Step 3: Fetch PAN data using the phone number from login response
      try {
        console.log("Fetching PAN data with phone number:", response.data.phoneNumber)
        const panResponse = await axios.get(`http://localhost:5000/api/users/pan/${response.data.phoneNumber}`)

        if (panResponse.data) {
          console.log("PAN data received:", panResponse.data)
          localStorage.setItem("panData", JSON.stringify(panResponse.data))
        }
      } catch (panErr) {
        console.error("Error fetching PAN data:", panErr)
        // Don't block login if PAN fetch fails
      }

      // Check if data was stored correctly
      console.log("After storing, localStorage aadhaarData:", localStorage.getItem("aadhaarData"))
      console.log("After storing, localStorage panData:", localStorage.getItem("panData"))

      setLoading(false)

      // Redirect to face verification page
      navigate("/face-verification")
    } catch (err: any) {
      setLoading(false)
      setError(err.response?.data?.message || "Login failed. Please try again.")
      console.error("Login error:", err)
    }
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setError("")
    setSuccessMessage("")
    if (value === "register") {
      setCurrentStep(1)
      setProgress(14)
    }
  }

  // Start camera for face capture - using the working implementation from FaceVerification
  const startCamera = async () => {
    console.log("Starting camera, videoRef:", videoRef.current)

    // If we're already in a camera active state, stop it first
    if (cameraActive) {
      stopCamera()
    }

    try {
      // Set camera active first to ensure the video element is rendered
      setCameraActive(true)

      // Wait a moment for the video element to be rendered in the DOM
      await new Promise((resolve) => setTimeout(resolve, 100))

      if (!videoRef.current) {
        console.error("Video element not found in DOM after waiting")
        setError("Camera initialization failed. Please refresh and try again.")
        setCameraActive(false)
        return
      }

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      }

      console.log("Requesting camera access...")
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Camera access granted")

      // Set the stream to the video element
      videoRef.current.srcObject = mediaStream
      setStream(mediaStream)

      // Wait for the video to be loaded
      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded")
        if (videoRef.current) {
          videoRef.current
            .play()
            .then(() => console.log("Video playback started"))
            .catch((e) => {
              console.error("Error playing video:", e)
              setError("Could not start video stream. Please check permissions.")
            })
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Unable to access camera. Please check your permissions and try again.")
      setCameraActive(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setCameraActive(false)
    }
  }

  // Capture face image
  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not initialized properly")
      return
    }

    try {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const context = canvas.getContext("2d")
      if (context) {
        // Draw the video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Get the image data as a data URL
        const imageDataUrl = canvas.toDataURL("image/jpeg")

        console.log("Image data captured:", imageDataUrl.substring(0, 50) + "...")

        setRegisterFormData({
          ...registerFormData,
          faceImage: imageDataUrl,
        })

        stopCamera()
        setSuccessMessage("Face captured successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
      }
    } catch (err) {
      console.error("Error capturing face:", err)
      setError("Failed to capture face image. Please try again.")
    }
  }

  // Verify Aadhaar
  const verifyAadhaar = async () => {
    if (!registerFormData.aadhaarPhoneNumber) {
      setError("Please enter Aadhaar-linked phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await axios.get(`http://localhost:5000/api/users/aadhaar/${registerFormData.aadhaarPhoneNumber}`)
      setAadhaarData(response.data)
      setAadhaarVerified(true)
      setLoading(false)
      setSuccessMessage("Aadhaar verified successfully!")

      // Populate form data from Aadhaar
      setRegisterFormData({
        ...registerFormData,
        firstName: response.data.fullName.split(" ")[0],
        lastName: response.data.fullName.split(" ").slice(1).join(" "),
      })

      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setLoading(false)
      setError(err.response?.data?.message || "Failed to verify Aadhaar. Please try again.")
      console.error("Aadhaar verification error:", err)
    }
  }

  // Verify Aadhaar OTP
  const verifyAadhaarOTP = () => {
    if (!registerFormData.aadhaarOtp) {
      setError("Please enter OTP sent to your Aadhaar-linked phone number")
      return
    }

    setLoading(true)
    setError("")

    // Simulate OTP verification with hardcoded OTP "1234"
    setTimeout(() => {
      if (registerFormData.aadhaarOtp === "1234") {
        setAadhaarOtpVerified(true)
        setLoading(false)
        setSuccessMessage("Aadhaar OTP verified successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        setLoading(false)
        setError("Invalid OTP. Please try again.")
      }
    }, 1000)
  }

  // Verify PAN
  const verifyPAN = async () => {
    if (!registerFormData.panPhoneNumber) {
      setError("Please enter PAN-linked phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await axios.get(`http://localhost:5000/api/users/pan/${registerFormData.panPhoneNumber}`)
      setPanData(response.data)
      setPanVerified(true)
      setLoading(false)
      setSuccessMessage("PAN verified successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setLoading(false)
      setError(err.response?.data?.message || "Failed to verify PAN. Please try again.")
      console.error("PAN verification error:", err)
    }
  }

  // Verify PAN OTP
  const verifyPanOTP = () => {
    if (!registerFormData.panOtp) {
      setError("Please enter OTP sent to your PAN-linked phone number")
      return
    }

    setLoading(true)
    setError("")

    // Simulate OTP verification with hardcoded OTP "1234"
    setTimeout(() => {
      if (registerFormData.panOtp === "1234") {
        setPanOtpVerified(true)
        setLoading(false)
        setSuccessMessage("PAN OTP verified successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        setLoading(false)
        setError("Invalid OTP. Please try again.")
      }
    }, 1000)
  }

  // Navigate to next step
  const nextStep = () => {
    if (
      currentStep === 1 &&
      (!registerFormData.firstName ||
        !registerFormData.lastName ||
        !registerFormData.email ||
        !registerFormData.password ||
        !registerFormData.confirmPassword ||
        !registerFormData.phoneNumber)
    ) {
      setError("Please fill in all fields")
      return
    }

    if (currentStep === 1 && registerFormData.password !== registerFormData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (currentStep === 2 && !registerFormData.faceImage) {
      setError("Please capture your face image")
      return
    }

    if (currentStep === 3 && !aadhaarVerified) {
      setError("Please verify your Aadhaar")
      return
    }

    if (currentStep === 4 && !aadhaarOtpVerified) {
      setError("Please verify OTP sent to your Aadhaar-linked phone number")
      return
    }

    if (currentStep === 5 && !panVerified) {
      setError("Please verify your PAN")
      return
    }

    if (currentStep === 6 && !panOtpVerified) {
      setError("Please verify OTP sent to your PAN-linked phone number")
      return
    }

    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
      setProgress(Math.round(((currentStep + 1) / 7) * 100))
      setError("")
    } else {
      handleRegisterSubmit()
    }
  }

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setProgress(Math.round(((currentStep - 1) / 7) * 100))
      setError("")
    }
  }

  // Submit registration
  const handleRegisterSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      // Register with Express backend
      const response = await axios.post("http://localhost:5000/api/users/register", {
        firstName: registerFormData.firstName,
        lastName: registerFormData.lastName,
        email: registerFormData.email,
        password: registerFormData.password,
        phoneNumber: registerFormData.phoneNumber,
        faceImage: registerFormData.faceImage,
        aadhaarNumber: aadhaarData?.aadhaarNumber,
        panNumber: panData?.panNumber,
      })

      // Save all data to localStorage
      localStorage.setItem("userId", response.data._id)
      localStorage.setItem("token", response.data.token)
      localStorage.setItem("userEmail", response.data.email)
      localStorage.setItem("userFirstName", response.data.firstName)
      localStorage.setItem("userLastName", response.data.lastName)
      localStorage.setItem("userPhoneNumber", response.data.phoneNumber)
      localStorage.setItem("userVerified", "true")

      console.log("Storing aadhaarData:", aadhaarData)
      console.log("Storing panData:", panData)

      if (aadhaarData) {
        localStorage.setItem("aadhaarData", JSON.stringify(aadhaarData))
      }

      if (panData) {
        localStorage.setItem("panData", JSON.stringify(panData))
      }

      console.log("After storing, localStorage aadhaarData:", localStorage.getItem("aadhaarData"))
      console.log("After storing, localStorage panData:", localStorage.getItem("panData"))

      setLoading(false)
      setSuccessMessage("Registration successful! Redirecting to dashboard...")

      // Redirect to dashboard after delay
      setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
    } catch (err: any) {
      setLoading(false)
      setError(err.response?.data?.message || "Registration failed. Please try again.")
      console.error("Registration error:", err)
    }
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Check localStorage on component mount
  useEffect(() => {
    const storedAadhaar = localStorage.getItem("aadhaarData")
    const storedPan = localStorage.getItem("panData")

    console.log("On mount - aadhaarData in localStorage:", storedAadhaar)
    console.log("On mount - panData in localStorage:", storedPan)

    if (storedAadhaar) {
      try {
        const parsedAadhaar = JSON.parse(storedAadhaar)
        console.log("Parsed aadhaarData:", parsedAadhaar)
      } catch (err) {
        console.error("Error parsing aadhaarData:", err)
      }
    }

    if (storedPan) {
      try {
        const parsedPan = JSON.parse(storedPan)
        console.log("Parsed panData:", parsedPan)
      } catch (err) {
        console.error("Error parsing panData:", err)
      }
    }
  }, [])

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Basic Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={registerFormData.firstName}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={registerFormData.lastName}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={registerFormData.email}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="1234567890"
                  value={registerFormData.phoneNumber}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={registerFormData.password}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={registerFormData.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>
          </div>
        )
      case 2: // Face Image
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="md:w-1/2">
                <h3 className="text-lg font-medium mb-2">Face Verification</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your face image will be used for identity verification. Please ensure good lighting and a clear view
                  of your face.
                </p>

                {!registerFormData.faceImage && !cameraActive && (
                  <Button className="w-full md:w-auto" onClick={startCamera}>
                    <Camera className="mr-2 h-4 w-4" /> Start Camera
                  </Button>
                )}

                {registerFormData.faceImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full md:w-auto"
                    onClick={() => {
                      setRegisterFormData({ ...registerFormData, faceImage: "" })
                      setSuccessMessage("")
                    }}
                  >
                    Retake Photo
                  </Button>
                )}
              </div>

              <div className="md:w-1/2 flex justify-center">
                {registerFormData.faceImage ? (
                  <div className="relative">
                    <img
                      src={registerFormData.faceImage || "/placeholder.svg"}
                      alt="Captured face"
                      className="w-64 h-48 rounded-lg border border-gray-300 object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-64 h-48 rounded-lg border border-gray-300"
                          style={{ transform: "scaleX(-1)" }} // Mirror effect for selfie view
                        />
                        <Button className="absolute bottom-2 left-1/2 transform -translate-x-1/2" onClick={captureFace}>
                          <Camera className="mr-2 h-4 w-4" /> Capture
                        </Button>
                      </>
                    ) : (
                      <div className="w-64 h-48 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50">
                        <User className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )
      case 3: // Aadhaar Verification
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <div className="grid gap-2">
                  <Label htmlFor="aadhaarPhoneNumber">Aadhaar-linked Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="aadhaarPhoneNumber"
                      name="aadhaarPhoneNumber"
                      type="tel"
                      placeholder="Enter phone number linked to Aadhaar"
                      value={registerFormData.aadhaarPhoneNumber}
                      onChange={handleRegisterChange}
                      disabled={aadhaarVerified}
                      required
                    />
                    <Button
                      onClick={verifyAadhaar}
                      disabled={loading || aadhaarVerified || !registerFormData.aadhaarPhoneNumber}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying
                        </>
                      ) : aadhaarVerified ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Verified
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>

                {!aadhaarVerified && (
                  <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Why we need this</h4>
                    <p className="text-xs text-blue-600">
                      We use your Aadhaar details to verify your identity and ensure secure access to your account. Your
                      information is encrypted and protected.
                    </p>
                  </div>
                )}
              </div>

              <div className="md:w-1/2">
                {aadhaarVerified && aadhaarData ? (
                  <Card className="border-blue-100">
                    <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-blue-700">Aadhaar Details</CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-600" /> Aadhaar Number:
                          </span>
                          <span className="text-sm">
                            {aadhaarData.aadhaarNumber.slice(0, 4)}...
                            {aadhaarData.aadhaarNumber.slice(-4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-blue-600" /> Full Name:
                          </span>
                          <span className="text-sm">{aadhaarData.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Gender:</span>
                          <span className="text-sm">{aadhaarData.gender}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Age:</span>
                          <span className="text-sm">{aadhaarData.age} years</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Father's Name:</span>
                          <span className="text-sm">{aadhaarData.fatherName}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="text-sm font-medium flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-blue-600" /> Address:
                          </span>
                          <span className="text-sm text-right max-w-[60%]">{aadhaarData.address}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-blue-200 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-blue-700">Aadhaar Verification</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Enter your Aadhaar-linked phone number to verify your identity
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 4: // Aadhaar OTP Verification
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <div className="grid gap-2">
                  <Label htmlFor="aadhaarOtp">Enter OTP sent to Aadhaar-linked Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="aadhaarOtp"
                      name="aadhaarOtp"
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={registerFormData.aadhaarOtp}
                      onChange={handleRegisterChange}
                      disabled={aadhaarOtpVerified}
                      maxLength={4}
                      required
                    />
                    <Button
                      onClick={verifyAadhaarOTP}
                      disabled={loading || aadhaarOtpVerified || !registerFormData.aadhaarOtp}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying
                        </>
                      ) : aadhaarOtpVerified ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Verified
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">OTP Verification</h4>
                  <p className="text-xs text-blue-600">
                    We've sent a one-time password (OTP) to your Aadhaar-linked phone number. Please enter the 4-digit code to verify your identity.
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    For this demo, use OTP: 1234
                  </p>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center">
                    <KeyRound className="h-12 w-12 text-blue-200 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-blue-700">OTP Verification</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter the OTP sent to your Aadhaar-linked phone number
                    </p>
                    {aadhaarOtpVerified && (
                      <Badge className="mt-4 bg-green-100 text-green-700 border-green-200">
                        OTP Verified Successfully
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 5: // PAN Verification
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <div className="grid gap-2">
                  <Label htmlFor="panPhoneNumber">PAN-linked Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="panPhoneNumber"
                      name="panPhoneNumber"
                      type="tel"
                      placeholder="Enter phone number linked to PAN"
                      value={registerFormData.panPhoneNumber}
                      onChange={handleRegisterChange}
                      disabled={panVerified}
                      required
                    />
                    <Button onClick={verifyPAN} disabled={loading || panVerified || !registerFormData.panPhoneNumber}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying
                        </>
                      ) : panVerified ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Verified
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>

                {!panVerified && (
                  <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="text-sm font-medium text-red-700 mb-2">Why we need this</h4>
                    <p className="text-xs text-red-600">
                      Your PAN details help us verify your financial information and comply with regulatory
                      requirements. This information is securely stored and protected.
                    </p>
                  </div>
                )}
              </div>

              <div className="md:w-1/2">
                {panVerified && panData ? (
                  <Card className="border-red-100">
                    <CardHeader className="pb-2 bg-red-50 border-b border-red-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-red-700">PAN Details</CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 max-h-[300px] overflow-y-auto">
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-600" /> PAN Number:
                          </span>
                          <span className="text-sm">
                            {panData.panNumber.slice(0, 2)}...
                            {panData.panNumber.slice(-2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-red-600" /> Full Name:
                          </span>
                          <span className="text-sm">{panData.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Tax Filing Status:</span>
                          <span className="text-sm">{panData.tax_filing_status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Income Range:</span>
                          <span className="text-sm">{panData.income_range}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Credit Score:</span>
                          <span className="text-sm">{panData.credit_score}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid gap-1">
                          <span className="text-sm font-medium">Spending Behavior:</span>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <span>Avg. Monthly Spend:</span>
                            <span className="text-right">₹{panData.spending_behavior?.avg_monthly_spend}</span>

                            <span>High Value Transactions:</span>
                            <span className="text-right">
                              {panData.spending_behavior?.high_value_transactions} per month
                            </span>

                            <span>Liquidity Ratio:</span>
                            <span className="text-right">{panData.spending_behavior?.liquidity_ratio}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-red-200 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-red-700">PAN Verification</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Enter your PAN-linked phone number to verify your financial information
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 6: // PAN OTP Verification
        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <div className="grid gap-2">
                  <Label htmlFor="panOtp">Enter OTP sent to PAN-linked Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="panOtp"
                      name="panOtp"
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={registerFormData.panOtp}
                      onChange={handleRegisterChange}
                      disabled={panOtpVerified}
                      maxLength={4}
                      required
                    />
                    <Button
                      onClick={verifyPanOTP}
                      disabled={loading || panOtpVerified || !registerFormData.panOtp}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying
                        </>
                      ) : panOtpVerified ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Verified
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="text-sm font-medium text-red-700 mb-2">OTP Verification</h4>
                  <p className="text-xs text-red-600">
                    We've sent a one-time password (OTP) to your PAN-linked phone number. Please enter the 4-digit code to verify your identity.
                  </p>
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    For this demo, use OTP: 1234
                  </p>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center">
                    <KeyRound className="h-12 w-12 text-red-200 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700">OTP Verification</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter the OTP sent to your PAN-linked phone number
                    </p>
                    {panOtpVerified && (
                      <Badge className="mt-4 bg-green-100 text-green-700 border-green-200">
                        OTP Verified Successfully
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 7: // Review & Submit
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Review Your Information</h3>
              <p className="text-sm text-muted-foreground">Please review your information before submitting</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-100">
                <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100">
                  <CardTitle className="text-md text-blue-700">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center mb-4">
                    {registerFormData.faceImage && (
                      <img
                        src={registerFormData.faceImage || "/placeholder.svg"}
                        alt="Face"
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                      />
                    )}
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm ml-auto">
                        {registerFormData.firstName} {registerFormData.lastName}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm ml-auto">{registerFormData.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm ml-auto">{registerFormData.phoneNumber}</span>
                    </div>
                    {aadhaarData && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm font-medium">Address:</span>
                        <span className="text-sm ml-auto text-right max-w-[60%]">{aadhaarData.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-100">
                <CardHeader className="pb-2 bg-red-50 border-b border-red-100">
                  <CardTitle className="text-md text-red-700">Verification Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-blue-600" /> Aadhaar Verification:
                      </span>
                      <Badge
                        className={aadhaarVerified ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"}
                      >
                        {aadhaarVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <KeyRound className="h-4 w-4 mr-2 text-blue-600" /> Aadhaar OTP:
                      </span>
                      <Badge
                        className={aadhaarOtpVerified ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"}
                      >
                        {aadhaarOtpVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-red-600" /> PAN Verification:
                      </span>
                      <Badge className={panVerified ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"}>
                        {panVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <KeyRound className="h-4 w-4 mr-2 text-red-600" /> PAN OTP:
                      </span>
                      <Badge
                        className={panOtpVerified ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"}
                      >
                        {panOtpVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <Camera className="h-4 w-4 mr-2 text-purple-600" /> Face Image:
                      </span>
                      <Badge
                        className={
                          registerFormData.faceImage ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"
                        }
                      >
                        {registerFormData.faceImage ? "Captured" : "Not Captured"}
                      </Badge>
                    </div>

                    {aadhaarVerified && aadhaarData && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Aadhaar Number:</span>
                        <span className="text-sm ml-2">
                          {aadhaarData.aadhaarNumber.slice(0, 4)}...
                          {aadhaarData.aadhaarNumber.slice(-4)}
                        </span>
                      </div>
                    )}

                    {panVerified && panData && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">PAN Number:</span>
                        <span className="text-sm ml-2">
                          {panData.panNumber.slice(0, 2)}...
                          {panData.panNumber.slice(-2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-medium mb-2">Terms and Conditions</p>
              <p className="text-sm">
                By clicking Submit, you agree to our Terms of Service and Privacy Policy. Your information will be
                securely stored and used for verification purposes only.
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Replace the entire return statement with this improved layout
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-lg border-blue-100 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side - Branding (visible on desktop) */}
          <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-600 to-blue-800 text-white flex-col items-center justify-center p-8">
            <div className="mb-6">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmel447CZtHaD4NE4J0KhrS9nSFMXhs6Y-hw&s"
                alt="Vyom Logo"
                className="h-20 w-20 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Vyom</h1>
            <p className="text-blue-100 text-center mb-6">Secure banking solutions for a better financial future</p>
            <div className="bg-white/10 p-4 rounded-lg text-sm">
              <p className="mb-2 font-medium">Why choose Vyom?</p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Secure biometric authentication
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Seamless digital banking experience
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Personalized financial insights
                </li>
              </ul>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="md:w-3/5">
            <CardHeader className="space-y-1 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {activeTab === "login" ? <span>Welcome Back</span> : <span>Create Account</span>}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === "login"
                      ? "Enter your credentials to access your account"
                      : "Complete the steps to create your verified account"}
                  </CardDescription>
                </div>
                {/* Logo visible on mobile only */}
                <Avatar className="h-12 w-12 bg-white border-2 border-blue-200 md:hidden">
                  <AvatarImage
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmel447CZtHaD4NE4J0KhrS9nSFMXhs6Y-hw&s"
                    alt="Vyom Logo"
                  />
                  <AvatarFallback className="bg-blue-600 text-white">VY</AvatarFallback>
                </Avatar>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="example@email.com"
                        value={loginFormData.email}
                        onChange={handleLoginChange}
                        required
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="login-password">Password</Label>
                        <a href="#" className="text-xs text-blue-600 hover:underline">
                          Forgot password?
                        </a>
                      </div>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginFormData.password}
                        onChange={handleLoginChange}
                        required
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <div className="space-y-4">
                    {activeTab === "register" && (
                      <div className="mb-6">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">
                            Step {currentStep} of 7:{" "}
                            {currentStep === 1
                              ? "Basic Information"
                              : currentStep === 2
                                ? "Face Capture"
                                : currentStep === 3
                                  ? "Aadhaar Verification"
                                  : currentStep === 4
                                    ? "Aadhaar OTP Verification"
                                    : currentStep === 5
                                      ? "PAN Verification"
                                      : currentStep === 6
                                        ? "PAN OTP Verification"
                                        : "Review & Submit"}
                          </span>
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-gray-100" />
                      </div>
                    )}

                    {renderStepContent()}

                    <div className="flex justify-between mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1 || loading}
                        className="border-blue-200 text-blue-700"
                      >
                        Back
                      </Button>

                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : currentStep === 7 ? (
                          "Submit"
                        ) : (
                          <>
                            Next
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-center justify-center p-6 border-t border-blue-100 bg-gradient-to-r from-white to-blue-50">
              <div className="text-center text-sm text-muted-foreground">
                {activeTab === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      className="text-blue-600 hover:underline font-medium"
                      onClick={() => handleTabChange("register")}
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      className="text-blue-600 hover:underline font-medium"
                      onClick={() => handleTabChange("login")}
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Login

