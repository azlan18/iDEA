"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  File,
  FileCheck,
  Filter,
  FolderOpen,
  Inbox,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Paperclip,
  PieChart,
  Search,
  Settings,
  UserCircle,
  Users,
  Play,
  Pause,
  Video,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast, Toaster } from "sonner"
import { Slider } from "@/components/ui/slider"

// Types
interface Ticket {
  _id: string
  ticketId: string
  userId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
  }
  issueDescription: string
  domain: string
  priorityScore: number
  assignedEmployees: Array<{
    employeeId: string
    assignedAt: string
    workDone?: string
  }>
  status: "Open" | "In Progress" | "Queued" | "On Hold" | "Completed"
  createdAt: string
  closedAt?: string
  customerFeedback?: string
  summaryOfWork?: string
  attachedFileId?: string
  meetLink?: string // Added meetLink to the Ticket interface
}

interface UserVerification {
  userId: string
  aadhaarDetails?: {
    fullName: string
    address: string
    phoneNumber: string
    age: number
    gender: string
    fatherName: string
    verified: boolean
    aadhaarNumber: string
  }
  panDetails?: {
    fullName: string
    phoneNumber: string
    tax_filing_status: string
    income_range: string
    is_verified: boolean
    credit_score: number
    spending_behavior: {
      avg_monthly_spend: number
      spending_categories: Record<string, number>
      payment_mode_distribution: Record<string, number>
      high_value_transactions: number
      liquidity_ratio: number
    }
    benchmark_data: {
      industry_avg_spend: number
      spending_deviation: string
    }
    loan_history: Array<{
      loan_id: string
      type: string
      amount: number
      status: string
      emi: number
      tenure: string
      applied_date: string
      closed_date?: string
    }>
    panNumber: string
  }
}

interface Statistics {
  totalTickets: number
  statusDistribution: {
    open: number
    inProgress: number
    queued: number
    onHold: number
    completed: number
  }
  domainDistribution: Array<{
    _id: string
    count: number
  }>
  priorityDistribution: Array<{
    _id: string
    count: number
  }>
}

export default function EmployeeDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<"dashboard" | "tickets" | "ticket-detail">("dashboard")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [userVerification, setUserVerification] = useState<UserVerification | null>(null)
  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isLoadingTicketDetail, setIsLoadingTicketDetail] = useState(false)
  const [isLoadingUserVerification, setIsLoadingUserVerification] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState({ field: "createdAt", order: "desc" })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(true)
  const [workDone, setWorkDone] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [holdReason, setHoldReason] = useState("")
  const [customerFeedback, setCustomerFeedback] = useState("")
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isMeetDialogOpen, setIsMeetDialogOpen] = useState(false) // New state for meeting dialog
  const [meetDate, setMeetDate] = useState("") // Date for meeting
  const [meetTime, setMeetTime] = useState("") // Time for meeting

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem("employeeId")
    if (storedEmployeeId) {
      setEmployeeId(storedEmployeeId)
    } else {
      const defaultEmployeeId = "EMP" + Math.floor(1000 + Math.random() * 9000)
      localStorage.setItem("employeeId", defaultEmployeeId)
      setEmployeeId(defaultEmployeeId)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ticketId = params.get("ticket")
    if (ticketId) {
      fetchTicketDetail(ticketId)
    }
  }, [])

  useEffect(() => {
    if (employeeId) {
      fetchStatistics()
    }
  }, [employeeId])

  useEffect(() => {
    if (employeeId) {
      fetchTickets()
    }
  }, [employeeId, currentPage, selectedDomain, selectedStatus, sort])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickets(tickets)
    } else {
      const filtered = tickets.filter(
        (ticket) =>
          ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${ticket.userId.firstName} ${ticket.userId.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.domain.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTickets(filtered)
    }
  }, [searchQuery, tickets])

  const fetchTickets = async () => {
    if (!employeeId) return

    setIsLoadingTickets(true)
    try {
      let url = `http://localhost:5000/api/employeeDashboard/tickets?employeeId=${employeeId}&page=${currentPage}&limit=10&sortBy=${sort.field}&sortOrder=${sort.order}`

      if (selectedDomain) {
        url += `&domain=${encodeURIComponent(selectedDomain)}`
      }

      if (selectedStatus) {
        url += `&status=${encodeURIComponent(selectedStatus)}`
      }

      const response = await axios.get(url)
      setTickets(response.data.tickets)
      setFilteredTickets(response.data.tickets)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("Failed to fetch tickets. Please try again.")
    } finally {
      setIsLoadingTickets(false)
    }
  }

  const fetchTicketDetail = async (ticketId: string) => {
    setIsLoadingTicketDetail(true)
    try {
      const response = await axios.get(`http://localhost:5000/api/employeeDashboard/tickets/${ticketId}`)
      setSelectedTicket(response.data)
      setActiveView("ticket-detail")

      fetchUserVerification(response.data.userId._id)

      if (response.data.attachedFileId && response.data.attachedFileId.endsWith(".wav")) {
        const audioUrl = `http://localhost:5000/api/employeeDashboard/attachments/${response.data.attachedFileId}`
        if (audioRef.current) {
          audioRef.current.src = audioUrl
          setAudioPlayer(audioRef.current)
        }
      }
    } catch (error) {
      console.error("Error fetching ticket detail:", error)
      toast.error("Failed to fetch ticket details. Please try again.")
    } finally {
      setIsLoadingTicketDetail(false)
    }
  }

  const fetchUserVerification = async (userId: string) => {
    setIsLoadingUserVerification(true)
    try {
      const response = await axios.get(`http://localhost:5000/api/employeeDashboard/user/${userId}/verification`)
      setUserVerification(response.data)
    } catch (error) {
      console.error("Error fetching user verification:", error)
      toast.warning("Could not fetch user verification details.")
    } finally {
      setIsLoadingUserVerification(false)
    }
  }

  const fetchStatistics = async () => {
    if (!employeeId) return

    setIsLoadingStatistics(true)
    try {
      const response = await axios.get(
        `http://localhost:5000/api/employeeDashboard/statistics?employeeId=${employeeId}`,
      )
      setStatistics(response.data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
      toast.warning("Could not fetch ticket statistics.")
    } finally {
      setIsLoadingStatistics(false)
    }
  }

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await axios.patch(`http://localhost:5000/api/employeeDashboard/tickets/${ticketId}/status`, { status })

      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: status as Ticket["status"],
          closedAt: status === "Completed" ? new Date().toISOString() : selectedTicket.closedAt,
        })
      }

      fetchTickets()
      toast.success(`Ticket status updated to ${status}.`)
    } catch (error) {
      console.error("Error updating ticket status:", error)
      toast.error("Failed to update ticket status. Please try again.")
    }
  }

  const addWorkUpdate = async () => {
    if (!selectedTicket || !workDone.trim() || !employeeId) {
      toast.error("Please provide work details.")
      return
    }

    try {
      const response = await axios.post(`http://localhost:5000/api/employeeDashboard/tickets/${selectedTicket.ticketId}/workupdate`, {
        employeeId,
        workDone,
      })

      setSelectedTicket(response.data)
      setWorkDone("")
      toast.success("Work update added successfully.")
    } catch (error) {
      console.error("Error adding work update:", error)
      toast.error("Failed to add work update. Please try again.")
    }
  }

  const holdTicket = async (ticketId: string, holdReason: string) => {
    try {
      await axios.post(`http://localhost:5000/api/employeeDashboard/tickets/hold`, {
        ticketId,
        holdReason,
      })

      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: "On Hold",
        })
      }

      fetchTickets()
      toast.success("Ticket placed on hold successfully.")
    } catch (error) {
      console.error("Error placing ticket on hold:", error)
      toast.error("Failed to place ticket on hold. Please try again.")
    }
  }

  const resumeTicket = async (ticketId: string) => {
    try {
      await axios.post(`http://localhost:5000/api/employeeDashboard/tickets/resume`, {
        ticketId,
        employeeId,
      })

      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: "In Progress",
        })
      }

      fetchTickets()
      toast.success("Ticket resumed successfully.")
    } catch (error) {
      console.error("Error resuming ticket:", error)
      toast.error("Failed to resume ticket. Please try again.")
    }
  }

  const completeTicket = async (ticketId: string, summaryOfWork: string, customerFeedback = "") => {
    try {
      await axios.post(`http://localhost:5000/api/employeeDashboard/tickets/complete`, {
        ticketId,
        summaryOfWork,
        customerFeedback,
      })

      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: "Completed",
          closedAt: new Date().toISOString(),
          summaryOfWork,
          customerFeedback,
        })
      }

      fetchTickets()
      toast.success("Ticket completed successfully.")
    } catch (error) {
      console.error("Error completing ticket:", error)
      toast.error("Failed to complete ticket. Please try again.")
    }
  }

  const generateMeeting = async (ticketId: string) => {
    try {
      let url = "http://localhost:5000/create-meet"
      if (meetDate && meetTime) {
        url += `?date=${meetDate}&time=${meetTime}`
      }

      const response = await axios.get(url)
      const { meetLink } = response.data

      // Update the ticket with the meetLink
      const updateResponse = await axios.patch(`http://localhost:5000/api/employeeDashboard/tickets/${ticketId}`, {
        meetLink,
      })

      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          meetLink,
        })
      }

      fetchTickets()
      toast.success("Google Meet link generated successfully!")
      return meetLink
    } catch (error) {
      console.error("Error generating meeting:", error)
      toast.error("Failed to generate Google Meet link. Please try again.")
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getPriorityBadge = (score: number) => {
    if (score <= 30) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          Low
        </Badge>
      )
    } else if (score <= 70) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
          Medium
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
          High
        </Badge>
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Open</Badge>
      case "In Progress":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>
      case "Queued":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Queued</Badge>
      case "On Hold":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">On Hold</Badge>
      case "Completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Toaster position="top-right" />
      <audio ref={audioRef} className="hidden" controls />

      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-200 flex flex-col ${
          sidebarOpen ? "w-64" : "w-0 -ml-64"
        }`}
      >
        <div className="h-16 flex items-center justify-center border-b px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-blue-600 rounded-md flex items-center justify-center text-white font-bold">
              UB
            </div>
            <div className="text-lg font-bold">
              <span className="text-red-600">Union</span> <span className="text-blue-600">Bank</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            <Button
              variant={activeView === "dashboard" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveView("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              variant={activeView === "tickets" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActiveView("tickets")
                setSelectedTicket(null)
              }}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Tickets
            </Button>

            <Separator className="my-2" />

            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-gray-500">Ticket Domains</h3>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start pl-8 text-sm"
              onClick={() => {
                setSelectedDomain("Retail Banking & Customer Support")
                setActiveView("tickets")
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Retail Banking
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start pl-8 text-sm"
              onClick={() => {
                setSelectedDomain("Loan & Credit Department")
                setActiveView("tickets")
              }}
            >
              <File className="mr-2 h-4 w-4" />
              Loan & Credit
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start pl-8 text-sm"
              onClick={() => {
                setSelectedDomain("Payments & Clearing Department")
                setActiveView("tickets")
              }}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Payments & Clearing
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start pl-8 text-sm"
              onClick={() => {
                setSelectedDomain("Wealth Management & Deposit Services")
                setActiveView("tickets")
              }}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Wealth Management
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start pl-8 text-sm"
              onClick={() => {
                setSelectedDomain("Regulatory & Compliance Department")
                setActiveView("tickets")
              }}
            >
              <FolderOpen className="mr-2 w-4 h-4" />
              Regulatory & Compliance
            </Button>

            <Separator className="my-2" />

            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>

            <Button variant="ghost" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>

            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="/placeholder.svg" />           
              <AvatarFallback className="bg-blue-600 text-white">EB</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Employee {employeeId}</p>
              <p className="text-xs text-muted-foreground">Customer Service</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="ml-4">
              <h1 className="text-lg font-semibold">
                {activeView === "dashboard" && "Employee Dashboard"}
                {activeView === "tickets" && "Service Tickets"}
                {activeView === "ticket-detail" && `Ticket: ${selectedTicket?.ticketId}`}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {activeView === "dashboard" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoadingStatistics ? (
                  <>
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                  </>
                ) : (
                  <>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium">Open Tickets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-blue-600">
                            {statistics?.statusDistribution?.open || 0}
                          </div>
                          <div className="bg-blue-100 p-2 rounded-md">
                            <Inbox className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <Progress
                          className="h-1 mt-4"
                          value={((statistics?.statusDistribution?.open || 0) / (statistics?.totalTickets || 1)) * 100}
                        />
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium">In Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-yellow-600">
                            {statistics?.statusDistribution?.inProgress || 0}
                          </div>
                          <div className="bg-yellow-100 p-2 rounded-md">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                        </div>
                        <Progress
                          className="h-1 mt-4"
                          value={
                            ((statistics?.statusDistribution?.inProgress || 0) / (statistics?.totalTickets || 1)) * 100
                          }
                        />
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium">Pending</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-purple-600">
                            {(statistics?.statusDistribution?.queued || 0) +
                              (statistics?.statusDistribution?.onHold || 0)}
                          </div>
                          <div className="bg-purple-100 p-2 rounded-md">
                            <Clock className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <Progress
                          className="h-1 mt-4"
                          value={
                            (((statistics?.statusDistribution?.queued || 0) +
                              (statistics?.statusDistribution?.onHold || 0)) /
                              (statistics?.totalTickets || 1)) *
                            100
                          }
                        />
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium">Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-green-600">
                            {statistics?.statusDistribution?.completed || 0}
                          </div>
                          <div className="bg-green-100 p-2 rounded-md">
                            <FileCheck className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <Progress
                          className="h-1 mt-4"
                          value={
                            ((statistics?.statusDistribution?.completed || 0) / (statistics?.totalTickets || 1)) * 100
                          }
                        />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Ticket Distribution by Department</CardTitle>
                    <CardDescription>Number of tickets in each department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStatistics ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {statistics?.domainDistribution.map((domain) => (
                          <div key={domain._id} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm">{domain._id}</span>
                              <span className="text-sm font-medium">{domain.count}</span>
                            </div>
                            <Progress value={(domain.count / (statistics?.totalTickets || 1)) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tickets by Priority</CardTitle>
                    <CardDescription>Distribution of ticket priority</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStatistics ? (
                      <div className="space-y-3">
                        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                        <Skeleton className="h-4 w-1/2 mx-auto" />
                        <Skeleton className="h-4 w-2/3 mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-center items-center space-x-6">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-medium text-sm">
                              {statistics?.priorityDistribution.find((p) => p._id === "Low")?.count || 0}
                            </div>
                            <p className="text-xs mt-1">Low</p>
                          </div>

                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 font-medium text-sm">
                              {statistics?.priorityDistribution.find((p) => p._id === "Medium")?.count || 0}
                            </div>
                            <p className="text-xs mt-1">Medium</p>
                          </div>

                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-medium text-sm">
                              {statistics?.priorityDistribution.find((p) => p._id === "High")?.count || 0}
                            </div>
                            <p className="text-xs mt-1">High</p>
                          </div>
                        </div>

                        <div className="bg-muted rounded-md p-4">
                          <p className="text-sm font-medium">Key Insights</p>
                          <ul className="text-xs space-y-1 mt-2">
                            <li>• High priority tickets need immediate attention</li>
                            <li>• Medium priority tickets need resolution within 24 hours</li>
                            <li>• Low priority tickets can be resolved within 48 hours</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>The most recent service tickets opened by customers</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveView("tickets")}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTickets
                        ? Array(5)
                            .fill(0)
                            .map((_, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-full" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-6 w-20" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-6 w-16" />
                                </TableCell>
                              </TableRow>
                            ))
                        : filteredTickets.slice(0, 5).map((ticket) => (
                            <TableRow
                              key={ticket._id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => fetchTicketDetail(ticket.ticketId)}
                            >
                              <TableCell className="font-medium">{ticket.ticketId}</TableCell>
                              <TableCell>
                                {ticket.userId.firstName} {ticket.userId.lastName}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{ticket.issueDescription}</TableCell>
                              <TableCell>{ticket.domain.split(" & ")[0]}</TableCell>
                              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                              <TableCell>{getPriorityBadge(ticket.priorityScore)}</TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "tickets" && (
            <div className="p-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>All Service Tickets</CardTitle>
                      <CardDescription>View and manage all customer service tickets</CardDescription>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tickets..."
                          className="pl-8 w-full sm:w-[240px]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex gap-2">
                            <Filter className="h-4 w-4" />
                            <span>Filter</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Filter Tickets</h4>

                            <div className="space-y-2">
                              <Label htmlFor="domain">Department</Label>
                              <Select
                                value={selectedDomain || ""}
                                onValueChange={(value) => setSelectedDomain(value || null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All departments" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All departments</SelectItem>
                                  <SelectItem value="Retail Banking & Customer Support">Retail Banking</SelectItem>
                                  <SelectItem value="Loan & Credit Department">Loan & Credit</SelectItem>
                                  <SelectItem value="Payments & Clearing Department">Payments & Clearing</SelectItem>
                                  <SelectItem value="Wealth Management & Deposit Services">
                                    Wealth Management
                                  </SelectItem>
                                  <SelectItem value="Regulatory & Compliance Department">
                                    Regulatory & Compliance
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={selectedStatus || ""}
                                onValueChange={(value) => setSelectedStatus(value || null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All statuses</SelectItem>
                                  <SelectItem value="Open">Open</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Queued">Queued</SelectItem>
                                  <SelectItem value="On Hold">On Hold</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sort">Sort By</Label>
                              <Select
                                value={`${sort.field}:${sort.order}`}
                                onValueChange={(value) => {
                                  const [field, order] = value.split(":")
                                  setSort({ field, order })
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sort tickets" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="createdAt:desc">Newest first</SelectItem>
                                  <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                                  <SelectItem value="priorityScore:desc">Highest priority</SelectItem>
                                  <SelectItem value="priorityScore:asc">Lowest priority</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-between">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDomain(null)
                                  setSelectedStatus(null)
                                  setSort({ field: "createdAt", order: "desc" })
                                }}
                              >
                                Reset
                              </Button>
                              <Button size="sm">Apply Filters</Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <ScrollArea className="rounded-md border">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="max-w-[300px]">Issue Description</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingTickets ? (
                          Array(10)
                            .fill(0)
                            .map((_, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-full" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-28" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-6 w-20" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-6 w-16" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-9 w-20" />
                                </TableCell>
                              </TableRow>
                            ))
                        ) : filteredTickets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                              {isLoadingTickets
                                ? "Loading tickets..."
                                : searchQuery.trim() !== ""
                                  ? "No tickets found matching your search."
                                  : "No tickets are currently assigned to you."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTickets.map((ticket) => (
                            <TableRow key={ticket._id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium" onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {ticket.ticketId}
                              </TableCell>
                              <TableCell onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {ticket.userId.firstName} {ticket.userId.lastName}
                              </TableCell>
                              <TableCell
                                className="max-w-xs truncate"
                                onClick={() => fetchTicketDetail(ticket.ticketId)}
                              >
                                {ticket.issueDescription}
                              </TableCell>
                              <TableCell onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {ticket.domain.split(" & ")[0]}
                              </TableCell>
                              <TableCell onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {formatDate(ticket.createdAt)}
                              </TableCell>
                              <TableCell onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {getStatusBadge(ticket.status)}
                              </TableCell>
                              <TableCell onClick={() => fetchTicketDetail(ticket.ticketId)}>
                                {getPriorityBadge(ticket.priorityScore)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      Update <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => updateTicketStatus(ticket.ticketId, "Open")}>
                                      Mark as Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateTicketStatus(ticket.ticketId, "In Progress")}
                                    >
                                      Mark as In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTicket(ticket)
                                        setIsHoldDialogOpen(true)
                                      }}
                                    >
                                      Place on Hold
                                    </DropdownMenuItem>
                                    {ticket.status === "On Hold" && (
                                      <DropdownMenuItem onClick={() => resumeTicket(ticket.ticketId)}>
                                        Resume Ticket
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTicket(ticket)
                                        setIsCompleteDialogOpen(true)
                                      }}
                                    >
                                      Complete Ticket
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {filteredTickets.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{" "}
                        <span className="font-medium">{Math.min(currentPage * 10, filteredTickets.length)}</span> of{" "}
                        <span className="font-medium">{filteredTickets.length}</span> tickets
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                        <div className="text-sm font-medium">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "ticket-detail" && selectedTicket && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <Button variant="ghost" size="sm" className="mb-2" onClick={() => setActiveView("tickets")}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to Tickets
                      </Button>
                      <CardTitle className="text-xl">Ticket: {selectedTicket.ticketId}</CardTitle>
                      <CardDescription>Created on {formatDate(selectedTicket.createdAt)}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            {getStatusBadge(selectedTicket.status)}
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateTicketStatus(selectedTicket.ticketId, "Open")}>
                            Mark as Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTicketStatus(selectedTicket.ticketId, "In Progress")}>
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTicketStatus(selectedTicket.ticketId, "Queued")}>
                            Mark as Queued
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTicketStatus(selectedTicket.ticketId, "On Hold")}>
                            Mark as On Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTicketStatus(selectedTicket.ticketId, "Completed")}>
                            Mark as Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMeetDialogOpen(true)}
                        disabled={!!selectedTicket.meetLink} // Disable if meetLink already exists
                      >
                        <Video className="mr-2 h-4 w-4" />
                        {selectedTicket.meetLink ? "Meeting Scheduled" : "Schedule Meeting"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Department</p>
                          <p className="text-base">{selectedTicket.domain}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Priority</p>
                          <div className="mt-1">{getPriorityBadge(selectedTicket.priorityScore)}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">Issue Description</p>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="whitespace-pre-wrap text-sm">{selectedTicket.issueDescription}</p>
                      </div>
                    </div>

                    {selectedTicket.meetLink && (
                      <div>
                        <p className="text-muted-foreground text-sm font-medium mb-1">Meeting Link</p>
                        <div className="p-3 bg-muted/50 rounded-md flex items-center">
                          <Video className="h-4 w-4 mr-2 text-muted-foreground" />
                          <a
                            href={selectedTicket.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {selectedTicket.meetLink}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedTicket.attachedFileId && (
                      <div>
                        <p className="text-muted-foreground text-sm font-medium mb-1">Attachments</p>
                        <div className="p-3 bg-muted/50 rounded-md flex items-center">
                          <Paperclip className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedTicket.attachedFileId}</span>

                          <div className="ml-auto space-x-2">
                            {selectedTicket.attachedFileId.endsWith(".wav") && (
                              <Button variant="outline" size="sm" onClick={() => audioRef.current?.play()}>
                                Play Audio
                              </Button>
                            )}
                            {(selectedTicket.attachedFileId.endsWith(".mp4") || selectedTicket.attachedFileId.endsWith(".webm")) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const videoUrl = `http://localhost:5000/api/employeeDashboard/attachments/${selectedTicket.attachedFileId}`
                                  const video = document.createElement('video')
                                  video.src = videoUrl
                                  video.controls = true
                                  video.style.maxWidth = '100%'
                                  video.style.maxHeight = '80vh'
                                  video.style.position = 'fixed'
                                  video.style.top = '50%'
                                  video.style.left = '50%'
                                  video.style.transform = 'translate(-50%, -50%)'
                                  video.style.zIndex = '1000'
                                  video.style.backgroundColor = 'black'
                                  document.body.appendChild(video)
                                  video.play()
                                  video.onended = () => document.body.removeChild(video)
                                  video.onerror = () => {
                                    document.body.removeChild(video)
                                    toast.error('Failed to play video.')
                                  }
                                }}
                              >
                                Play Video
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(
                                    `http://localhost:5000/api/employeeDashboard/attachments/${selectedTicket.attachedFileId}?download=true`
                                  )
                                  if (!response.ok) throw new Error('File download failed')

                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  const contentDisposition = response.headers.get('Content-Disposition')
                                  const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
                                  const filename = filenameMatch ? filenameMatch[1] : selectedTicket.attachedFileId.split('_').pop()
                                  link.download = filename || 'download'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  window.URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Download error:', error)
                                  toast.error('Failed to download file. Please try again.')
                                }
                              }}
                            >
                              Download
                            </Button>
                          </div>
                        </div>

                        {selectedTicket.attachedFileId.endsWith(".wav") && audioPlayer && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-md">
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (audioRef.current?.paused) {
                                    audioRef.current.play()
                                  } else {
                                    audioRef.current?.pause()
                                  }
                                }}
                              >
                                {audioRef.current?.paused ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                              </Button>
                              <div className="w-full mx-2">
                                <Slider
                                  value={[audioPlayer?.currentTime || 0]}
                                  max={audioPlayer?.duration || 0}
                                  step={0.1}
                                  className="w-full"
                                  onValueChange={(value) => {
                                    if (audioRef.current) {
                                      audioRef.current.currentTime = value[0]
                                    }
                                  }}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {audioPlayer?.currentTime ? Math.floor(audioPlayer.currentTime / 60) : 0}:
                                {audioPlayer?.currentTime
                                  ? Math.floor(audioPlayer.currentTime % 60)
                                      .toString()
                                      .padStart(2, "0")
                                  : "00"}{" "}
                                /{audioPlayer?.duration ? Math.floor(audioPlayer.duration / 60) : 0}:
                                {audioPlayer?.duration
                                  ? Math.floor(audioPlayer.duration % 60)
                                      .toString()
                                      .padStart(2, "0")
                                  : "00"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">Work History</p>
                      {selectedTicket.assignedEmployees && selectedTicket.assignedEmployees.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTicket.assignedEmployees.map((employee, idx) => (
                            <div key={idx} className="p-3 bg-muted/50 rounded-md">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">Employee: {employee.employeeId}</span>
                                <span className="text-muted-foreground">{formatDate(employee.assignedAt)}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {employee.workDone || "No details provided"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <p className="text-sm text-muted-foreground">No work updates yet</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="workDone" className="text-muted-foreground text-sm font-medium">
                        Add Work Update
                      </Label>
                      <div className="mt-1">
                        <Textarea
                          id="workDone"
                          placeholder="Describe the work you have done or plan to do..."
                          className="resize-none"
                          rows={3}
                          value={workDone}
                          onChange={(e) => setWorkDone(e.target.value)}
                        />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button onClick={addWorkUpdate}>Save Update</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Financial and personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingUserVerification ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-2/3 mx-auto" />
                          <Skeleton className="h-4 w-1/2 mx-auto" />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center">
                          <Avatar className="h-16 w-16 mb-2">
                            <AvatarImage src="/placeholder.svg" />
                            <AvatarFallback className="bg-primary text-white text-lg">
                              {selectedTicket.userId.firstName?.[0]}
                              {selectedTicket.userId.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="text-lg font-semibold">
                            {selectedTicket.userId.firstName} {selectedTicket.userId.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{selectedTicket.userId.email}</p>
                          <p className="text-sm text-muted-foreground">{selectedTicket.userId.phoneNumber}</p>
                        </div>

                        <Separator />

                        <div>
                          <Tabs defaultValue="verification">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="verification">ID Verification</TabsTrigger>
                              <TabsTrigger value="financial">Financial</TabsTrigger>
                              <TabsTrigger value="history">Loan History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="verification" className="space-y-4 pt-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium">Aadhaar Verification</h4>
                                  {userVerification?.aadhaarDetails?.verified ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                      Unverified
                                    </Badge>
                                  )}
                                </div>

                                {userVerification?.aadhaarDetails ? (
                                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Aadhaar Number:</span>
                                      <span>{userVerification.aadhaarDetails.aadhaarNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Full Name:</span>
                                      <span>{userVerification.aadhaarDetails.fullName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Age:</span>
                                      <span>{userVerification.aadhaarDetails.age} years</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Gender:</span>
                                      <span>{userVerification.aadhaarDetails.gender}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Father's Name:</span>
                                      <span>{userVerification.aadhaarDetails.fatherName}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                                    No Aadhaar details available
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium">PAN Verification</h4>
                                  {userVerification?.panDetails?.is_verified ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                      Unverified
                                    </Badge>
                                  )}
                                </div>

                                {userVerification?.panDetails ? (
                                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">PAN Number:</span>
                                      <span>{userVerification.panDetails.panNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Full Name:</span>
                                      <span>{userVerification.panDetails.fullName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Phone Number:</span>
                                      <span>{userVerification.panDetails.phoneNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Tax Filing Status:</span>
                                      <span>{userVerification.panDetails.tax_filing_status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Income Range:</span>
                                      <span>{userVerification.panDetails.income_range}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Credit Score:</span>
                                      <span>{userVerification.panDetails.credit_score}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                                    No PAN details available
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            <TabsContent value="financial" className="space-y-4 pt-3">
                              {userVerification?.panDetails ? (
                                <div className="space-y-4">
                                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                                    <h4 className="font-medium">Spending Behavior</h4>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Avg Monthly Spend:</span>
                                      <span>₹{userVerification.panDetails.spending_behavior.avg_monthly_spend.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">High-Value Transactions:</span>
                                      <span>{userVerification.panDetails.spending_behavior.high_value_transactions}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Liquidity Ratio:</span>
                                      <span>{userVerification.panDetails.spending_behavior.liquidity_ratio.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                                    <h4 className="font-medium">Benchmark Data</h4>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Industry Avg Spend:</span>
                                      <span>₹{userVerification.panDetails.benchmark_data.industry_avg_spend.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Spending Deviation:</span>
                                      <span>{userVerification.panDetails.benchmark_data.spending_deviation}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                                  No financial details available
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="history" className="space-y-4 pt-3">
                              {userVerification?.panDetails?.loan_history && userVerification.panDetails.loan_history.length > 0 ? (
                                <ScrollArea className="h-[200px]">
                                  {userVerification.panDetails.loan_history.map((loan) => (
                                    <div key={loan.loan_id} className="rounded-md bg-muted/50 p-3 mb-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Loan ID:</span>
                                        <span>{loan.loan_id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type:</span>
                                        <span>{loan.type}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span>₹{loan.amount.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span>{loan.status}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">EMI:</span>
                                        <span>₹{loan.emi.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Applied:</span>
                                        <span>{formatDate(loan.applied_date)}</span>
                                      </div>
                                      {loan.closed_date && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Closed:</span>
                                          <span>{formatDate(loan.closed_date)}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </ScrollArea>
                              ) : (
                                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                                  No loan history available
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>

        {/* Hold Ticket Dialog */}
        {isHoldDialogOpen && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Place Ticket on Hold</CardTitle>
                <CardDescription>Provide a reason for placing {selectedTicket.ticketId} on hold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter reason for holding the ticket..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsHoldDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        holdTicket(selectedTicket.ticketId, holdReason)
                        setIsHoldDialogOpen(false)
                        setHoldReason("")
                      }}
                      disabled={!holdReason.trim()}
                    >
                      Place on Hold
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Complete Ticket Dialog */}
        {isCompleteDialogOpen && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Complete Ticket</CardTitle>
                <CardDescription>Finalize {selectedTicket.ticketId} with a summary and optional feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="summary">Summary of Work</Label>
                    <Textarea
                      id="summary"
                      placeholder="Summarize the work done..."
                      value={workDone}
                      onChange={(e) => setWorkDone(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Customer Feedback (Optional)</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Enter customer feedback if available..."
                      value={customerFeedback}
                      onChange={(e) => setCustomerFeedback(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        completeTicket(selectedTicket.ticketId, workDone, customerFeedback)
                        setIsCompleteDialogOpen(false)
                        setWorkDone("")
                        setCustomerFeedback("")
                      }}
                      disabled={!workDone.trim()}
                    >
                      Complete Ticket
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schedule Meeting Dialog */}
        {isMeetDialogOpen && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Schedule Google Meet</CardTitle>
                <CardDescription>Schedule a meeting for {selectedTicket.ticketId}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meetDate">Date</Label>
                    <Input
                      id="meetDate"
                      type="date"
                      value={meetDate}
                      onChange={(e) => setMeetDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]} // Prevent past dates
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetTime">Time</Label>
                    <Input
                      id="meetTime"
                      type="time"
                      value={meetTime}
                      onChange={(e) => setMeetTime(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsMeetDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        const meetLink = await generateMeeting(selectedTicket.ticketId)
                        if (meetLink) {
                          setIsMeetDialogOpen(false)
                          setMeetDate("")
                          setMeetTime("")
                        }
                      }}
                    >
                      Schedule Meeting
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}