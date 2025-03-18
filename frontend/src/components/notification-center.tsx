"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell, X, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface NotificationCenterProps {
  onClose: () => void
}

// Mock notifications
const mockNotifications = [
  {
    id: "n1",
    title: "Loan Application Update",
    message: "Your home loan application has been approved. Please check your email for details.",
    time: "10 minutes ago",
    type: "success",
    read: false,
  },
  {
    id: "n2",
    title: "Upcoming Appointment",
    message: "Reminder: You have a video appointment with Rahul Sharma tomorrow at 2:30 PM.",
    time: "1 hour ago",
    type: "info",
    read: false,
  },
  {
    id: "n3",
    title: "Security Alert",
    message: "A login attempt was detected from a new device. Please verify if this was you.",
    time: "3 hours ago",
    type: "warning",
    read: true,
  },
  {
    id: "n4",
    title: "Transaction Alert",
    message: "A transaction of ₹15,000 was made from your account to HDFC Bank.",
    time: "Yesterday",
    type: "info",
    read: true,
  },
  {
    id: "n5",
    title: "Service Ticket Update",
    message: "Your service ticket #T-1234 has been assigned to a representative.",
    time: "2 days ago",
    type: "info",
    read: true,
  },
]

export const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState(mockNotifications)

  // Filter notifications based on active tab
  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications.filter((n) => n.type === activeTab)

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="bg-white rounded-md shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="warning">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="max-h-[400px] overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            <div>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex">
                    <div
                      className={`p-2 rounded-full mr-3 ${
                        notification.type === "success"
                          ? "bg-green-100"
                          : notification.type === "warning"
                            ? "bg-yellow-100"
                            : "bg-blue-100"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                        {!notification.read && <span className="text-xs text-blue-600 font-medium">New</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-medium">No notifications</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have any {activeTab !== "all" ? activeTab : ""} notifications at the moment.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {notifications.filter((n) => !n.read).length} unread notifications
        </span>
        <Button variant="ghost" size="sm">
          Mark all as read
        </Button>
      </div>
    </div>
  )
}

