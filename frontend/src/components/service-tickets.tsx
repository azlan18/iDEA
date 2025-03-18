"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Plus, Video, MessageSquare, Clock, Link as LinkIcon, ChevronDown, ChevronUp } from "lucide-react"

interface ServiceTicketsProps {
  fullView?: boolean
}

interface Ticket {
  _id: string
  ticketId: string
  issueDescription: string
  status: string
  domain: string
  createdAt: string
  attachedFileId?: string
  priorityScore: number
  type?: string
  meetLink?: string
  closedAt?: string
}

export const ServiceTickets = ({ fullView = false }: ServiceTicketsProps) => {
  const [activeTab, setActiveTab] = useState("all")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true)
        
        // Get userId from local storage
        const userId = localStorage.getItem("userId")
        
        if (!userId) {
          throw new Error("User ID not found in local storage")
        }
        
        const response = await fetch(`http://localhost:5000/api/ticketsDashboard/tickets/${userId}`)
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Process the tickets to match our component's expected format
        const processedTickets = data.tickets.map((ticket: any) => ({
          ...ticket,
          // Determine ticket type based on attachedFileId or meetLink
          type: ticket.meetLink ? "video" : ticket.attachedFileId ? "document" : "chat",
          // Calculate priority from priorityScore if available
          priority: getPriorityFromScore(ticket.priorityScore)
        }))
        
        setTickets(processedTickets)
      } catch (err) {
        console.error("Failed to fetch tickets:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch tickets")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [])

  // Toggle expanded state for a ticket
  const toggleExpanded = (ticketId: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }))
  }

  // Helper function to determine priority from score
  const getPriorityFromScore = (score?: number): string => {
    if (!score) return "Medium"
    if (score >= 70) return "High"
    if (score >= 40) return "Medium"
    return "Low"
  }

  // Filter tickets based on active tab
  const filteredTickets =
    activeTab === "all"
      ? tickets
      : tickets.filter((ticket) =>
          activeTab === "open"
            ? ["Open", "In Progress", "Queued", "On Hold"].includes(ticket.status)
            : ticket.status === "Completed",
        )

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "In Progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Queued":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "On Hold":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date)
  }

  // Format date (short version for collapsed view)
  const formatShortDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
    }).format(date)
  }

  // Handle new ticket creation
  const handleCreateTicket = () => {
    // Navigate to ticket creation page or open modal
    console.log("Create new ticket")
  }

  // Get the correct icon for ticket type
  const getTicketTypeIcon = (ticket: Ticket) => {
    if (ticket.type === "video") {
      return <Video className="h-4 w-4 text-blue-600" />
    } else if (ticket.type === "document") {
      return <FileText className="h-4 w-4 text-purple-600" />
    } else {
      return <MessageSquare className="h-4 w-4 text-green-600" />
    }
  }

  // Get the background color for the ticket type icon
  const getTicketTypeBackground = (ticket: Ticket) => {
    if (ticket.type === "video") {
      return "bg-blue-100"
    } else if (ticket.type === "document") {
      return "bg-purple-100"
    } else {
      return "bg-green-100"
    }
  }

  return (
    <Card className={fullView ? "h-full" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Service Tickets</CardTitle>
          <CardDescription>Track and manage your service requests</CardDescription>
        </div>
        <Button size="sm" onClick={handleCreateTicket}>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-pulse text-center">
                  <div className="h-6 w-32 bg-gray-200 rounded mx-auto mb-2"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded mx-auto"></div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <FileText className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium">Failed to load tickets</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button className="mt-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <motion.div
                      key={ticket._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpanded(ticket._id)}
                    >
                      {/* Collapsed View - Just the essentials */}
                      <div className="p-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getTicketTypeBackground(ticket)}`}>
                            {getTicketTypeIcon(ticket)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{ticket.ticketId}</span>
                              <Badge variant="outline" className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span>{formatShortDate(ticket.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {ticket.meetLink && !expandedTickets[ticket._id] && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mr-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(ticket.meetLink, '_blank');
                              }}
                            >
                              <Video className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {expandedTickets[ticket._id] ? 
                            <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded View - Show all details */}
                      {expandedTickets[ticket._id] && (
                        <div className="px-4 pb-4 pt-1 border-t">
                          <h4 className="font-medium mb-2">{ticket.issueDescription}</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Priority</p>
                              <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                                {ticket.priority} Priority
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Department</p>
                              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                                {ticket.domain}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                            <div className="flex items-center text-sm">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {ticket.status === "Completed" && ticket.closedAt 
                                  ? `Completed on: ${formatDate(ticket.closedAt)}` 
                                  : `Created on: ${formatDate(ticket.createdAt)}`}
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex justify-end mt-4">
                            <Button variant="outline" size="sm" className="mr-2">
                              View Details
                            </Button>
                            {ticket.status !== "Completed" && (
                              <>
                                {ticket.meetLink ? (
                                  <Button 
                                    size="sm" 
                                    as="a" 
                                    href={ticket.meetLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Video className="mr-2 h-4 w-4" />
                                    Join Meeting
                                  </Button>
                                ) : ticket.type === "chat" ? (
                                  <Button 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Continue Chat
                                  </Button>
                                ) : ticket.type === "document" ? (
                                  <Button 
                                    size="sm" 
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Document
                                  </Button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-medium">No tickets found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeTab === "resolved"
                        ? "You don't have any completed tickets yet."
                        : "You don't have any open tickets at the moment."}
                    </p>
                    {activeTab !== "resolved" && (
                      <Button className="mt-4" onClick={(e) => {
                        e.stopPropagation();
                        handleCreateTicket();
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Ticket
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      {!fullView && !isLoading && !error && (
        <CardFooter className="border-t pt-4 flex justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </p>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("all")}>
            View All Tickets
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}