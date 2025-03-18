"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  PieChart,
  Settings,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { UserProfileCard } from "@/components/user-profile-card"
import { FinancialOverview } from "@/components/financial-overview"
import { ServiceTickets } from "@/components/service-tickets"
import { AppointmentScheduler } from "@/components/appointment-scheduler"
import { RecentTransactions } from "@/components/recent-transactions"
import { LoanOffers } from "@/components/loan-offers"
import { NotificationCenter } from "@/components/notification-center"
import Chat from "@/components/Chat"

const Dashboard = () => {
  const navigate = useNavigate()
  const [userData, setUserData] = useState<any>(null)
  const [aadhaarData, setAadhaarData] = useState<any>(null)
  const [panData, setPanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isChatOpen, setIsChatOpen] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem("userId")
    if (!userId) {
      navigate("/")
      return
    }

    // Load user data from localStorage
    const firstName = localStorage.getItem("userFirstName") || ""
    const lastName = localStorage.getItem("userLastName") || ""
    const email = localStorage.getItem("userEmail") || ""
    const phoneNumber = localStorage.getItem("userPhoneNumber") || ""
    const verified = localStorage.getItem("userVerified") === "true"

    // Load Aadhaar and PAN data if available
    const storedAadhaarData = localStorage.getItem("aadhaarData")
    const storedPanData = localStorage.getItem("panData")

    setUserData({
      userId,
      firstName,
      lastName,
      email,
      phoneNumber,
      verified,
      fullName: `${firstName} ${lastName}`,
    })

    if (storedAadhaarData) {
      setAadhaarData(JSON.parse(storedAadhaarData))
    }

    if (storedPanData) {
      setPanData(JSON.parse(storedPanData))
    }

    setLoading(false)
  }, [navigate])

  const handleLogout = () => {
    // Clear localStorage
    localStorage.clear()
    navigate("/")
  }

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar variant="inset" collapsible="icon" className="bg-white border-r">
          <SidebarHeader className="flex items-center justify-center py-6">
            <div className="flex items-center space-x-2">
              <img
                src="/union-bank-logo.svg"
                alt="Union Bank of India"
                className="h-8 w-8"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJDMiAxNy41MiA2LjQ4IDIyIDEyIDIyQzE3LjUyIDIyIDIyIDE3LjUyIDIyIDEyQzIyIDYuNDggMTcuNTIgMiAxMiAyWk0xMiA1QzEzLjY2IDUgMTUgNi4zNCAxNSA4QzE1IDkuNjYgMTMuNjYgMTEgMTIgMTFDMTAuMzQgMTEgOSA5LjY2IDkgOEM5IDYuMzQgMTAuMzQgNSAxMiA1Wk0xMiAxOUM5LjUgMTkgNy4yOSAxNy45MiA2IDE2LjE4QzYuMDMgMTQuMTIgMTAgMTMgMTIgMTNDMTMuOTkgMTMgMTcuOTcgMTQuMTIgMTggMTYuMThDMTYuNzEgMTcuOTIgMTQuNSAxOSAxMiAxOVoiIGZpbGw9IiNFNDI5MjkiLz48L3N2Zz4="
                }}
              />
              <div className="font-bold text-lg text-primary">
                <span className="text-red-600">Union</span> <span className="text-blue-600">Bank</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
                  <Home className="h-5 w-5" />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("accounts")}>
                  <CreditCard className="h-5 w-5" />
                  <span>Accounts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("transactions")}>
                  <DollarSign className="h-5 w-5" />
                  <span>Transactions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("tickets")} isActive={activeTab === "tickets"}>
                  <FileText className="h-5 w-5" />
                  <span>Service Tickets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("appointments")} isActive={activeTab === "appointments"}>
                  <Calendar className="h-5 w-5" />
                  <span>Appointments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("analytics")}>
                  <PieChart className="h-5 w-5" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("video-banking")}>
                  <Video className="h-5 w-5" />
                  <span>Video Banking</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("support")}>
                  <HelpCircle className="h-5 w-5" />
                  <span>Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab("settings")}>
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-xl font-semibold">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "tickets" && "Service Tickets"}
                {activeTab === "appointments" && "Appointment Scheduler"}
                {activeTab === "accounts" && "My Accounts"}
                {activeTab === "transactions" && "Recent Transactions"}
                {activeTab === "analytics" && "Financial Analytics"}
                {activeTab === "video-banking" && "Video Banking"}
                {activeTab === "support" && "Customer Support"}
                {activeTab === "settings" && "Account Settings"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                </Button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50"
                    >
                      <NotificationCenter onClose={() => setShowNotifications(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={userData?.faceImage || "/placeholder.svg"} />
                  <AvatarFallback className="bg-primary text-white">
                    {userData?.firstName?.[0]}
                    {userData?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{userData?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{userData?.email}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <UserProfileCard userData={userData} aadhaarData={aadhaarData} panData={panData} />
                    <div className="md:col-span-2">
                      <FinancialOverview panData={panData} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <RecentTransactions />
                    </div>
                    <div>
                      <LoanOffers panData={panData} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ServiceTickets />
                    <AppointmentScheduler />
                  </div>
                </motion.div>
              )}

              {activeTab === "tickets" && (
                <motion.div key="tickets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ServiceTickets fullView />
                </motion.div>
              )}

              {activeTab === "appointments" && (
                <motion.div key="appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AppointmentScheduler fullView />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>

      {/* Chat Component */}
      <Chat isOpen={isChatOpen} onToggle={toggleChat} />
    </SidebarProvider>
  )
}

export default Dashboard

