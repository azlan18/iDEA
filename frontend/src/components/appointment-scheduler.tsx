"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, Video, User, Plus } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

interface AppointmentSchedulerProps {
  fullView?: boolean
}

// Mock data for appointments
const mockAppointments = [
  {
    id: "A-1234",
    title: "Loan Consultation",
    date: "2023-12-20T14:30:00Z",
    duration: 30,
    department: "Loans",
    advisor: "Rahul Sharma",
    status: "Scheduled",
  },
  {
    id: "A-1235",
    title: "Investment Planning",
    date: "2023-12-22T11:00:00Z",
    duration: 45,
    department: "Wealth Management",
    advisor: "Priya Patel",
    status: "Scheduled",
  },
  {
    id: "A-1236",
    title: "Account Review",
    date: "2023-12-18T10:15:00Z",
    duration: 30,
    department: "Customer Service",
    advisor: "Amit Kumar",
    status: "Completed",
  },
]

// Mock data for available time slots
const mockTimeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
]

export const AppointmentScheduler = ({ fullView = false }: AppointmentSchedulerProps) => {
  const [activeTab, setActiveTab] = useState("upcoming")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)

  // Filter appointments based on active tab
  const filteredAppointments =
    activeTab === "upcoming"
      ? mockAppointments.filter((apt) => apt.status === "Scheduled")
      : mockAppointments.filter((apt) => apt.status === "Completed")

  // Format date
  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date)
  }

  // Get time from date
  const getTimeFromDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date)
  }

  return (
    <Card className={fullView ? "h-full" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Schedule and manage your appointments</CardDescription>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </CardHeader>
      <CardContent>
        {fullView ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Tabs defaultValue="upcoming" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="pt-4">
                  <div className="space-y-4">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                        <motion.div
                          key={appointment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full mr-3 bg-blue-100">
                                <Video className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <span className="text-xs text-muted-foreground mr-2">{appointment.id}</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      appointment.status === "Scheduled"
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                                    }
                                  >
                                    {appointment.status}
                                  </Badge>
                                </div>
                                <h4 className="font-medium mt-1">{appointment.title}</h4>
                              </div>
                            </div>
                          </div>

                          <div className="ml-10 mt-3 space-y-2">
                            <div className="flex items-center text-sm">
                              <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{formatAppointmentDate(appointment.date)}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{appointment.duration} minutes</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>
                                {appointment.advisor} ({appointment.department})
                              </span>
                            </div>
                          </div>

                          {appointment.status === "Scheduled" && (
                            <div className="flex justify-end mt-4">
                              <Button variant="outline" size="sm" className="mr-2">
                                Reschedule
                              </Button>
                              <Button size="sm">
                                <Video className="mr-2 h-4 w-4" />
                                Join Meeting
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium">No appointments found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activeTab === "upcoming"
                            ? "You don't have any upcoming appointments."
                            : "You don't have any past appointments."}
                        </p>
                        {activeTab === "upcoming" && (
                          <Button className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Schedule Appointment
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Schedule New Appointment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select Date</label>
                      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Select a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(date) => {
                              setDate(date)
                              setShowCalendar(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {date && (
                      <div>
                        <label className="text-sm font-medium">Available Time Slots</label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {mockTimeSlots.map((slot, index) => (
                            <Button key={index} variant="outline" className="text-xs py-1" disabled={index % 3 === 0}>
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Department</label>
                      <select className="w-full mt-1 p-2 border rounded-md">
                        <option>Loans</option>
                        <option>Wealth Management</option>
                        <option>Customer Service</option>
                        <option>Cards</option>
                        <option>Digital Banking</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Purpose</label>
                      <select className="w-full mt-1 p-2 border rounded-md">
                        <option>Loan Consultation</option>
                        <option>Investment Planning</option>
                        <option>Account Review</option>
                        <option>Credit Card Services</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <Button className="w-full mt-4">Schedule Appointment</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mockAppointments
              .filter((apt) => apt.status === "Scheduled")
              .slice(0, 2)
              .map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full mr-3 bg-blue-100">
                      <Video className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{appointment.title}</h4>
                      <p className="text-sm text-muted-foreground">{formatAppointmentDate(appointment.date)}</p>
                    </div>
                  </div>
                  <Button size="sm">Join</Button>
                </div>
              ))}
          </div>
        )}
      </CardContent>
      {!fullView && (
        <CardFooter className="border-t pt-4">
          <Button variant="outline" className="w-full">
            View All Appointments
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

