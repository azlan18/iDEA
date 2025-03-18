"use client";

import type React from "react";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart3,
  ChevronLeft,
  File,
  Filter,
  Inbox,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast, Toaster } from "sonner";
import InsightsDashboard from "@/pages/InsightsDashboard";

// Types
interface Ticket {
  _id: string;
  ticketId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  issueDescription: string;
  domain: string;
  priorityScore: number;
  assignedEmployees: Array<{
    employeeId: string;
    assignedAt: string;
    workDone?: string;
  }>;
  status: "Open" | "In Progress" | "Queued" | "On Hold" | "Completed";
  createdAt: string;
  closedAt?: string;
  customerFeedback?: string;
  summaryOfWork?: string;
  attachedFileId?: string;
}

interface Employee {
  id: string;
  name?: string;
  domains: string[];
  isFree: boolean;
  currentTicket?: {
    ticketId: string;
    domain: string;
    priorityScore: number;
  };
}

// Sample employee data
const employees: Employee[] = [
  { id: "EMP001", name: "John Doe", domains: ["Retail Banking & Customer Support"], isFree: true },
  {
    id: "EMP002",
    name: "Jane Smith",
    domains: ["Loan & Credit Department"],
    isFree: false,
    currentTicket: {
      ticketId: "TICKET-123",
      domain: "Loan & Credit Department",
      priorityScore: 80,
    },
  },
];

const ManagerDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<
    "dashboard" | "tickets" | "ticket-detail" | "reports"
  >("dashboard");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(true);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sort, setSort] = useState<{ field: string; order: "asc" | "desc" }>({
    field: "createdAt",
    order: "desc",
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async (): Promise<void> => {
    setIsLoadingTickets(true);
    try {
      const response = await axios.get("http://localhost:5000/api/manager/tickets", {
        headers: { Authorization: `Bearer ${localStorage.getItem("managerToken")}` },
      });
      const fetchedTickets: Ticket[] = response.data;
      setTickets(fetchedTickets);
      applyFilters(fetchedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets. Please try again.");
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const applyFilters = (ticketsToFilter: Ticket[]): void => {
    let filtered = [...ticketsToFilter];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        ticket =>
          ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${ticket.userId.firstName} ${ticket.userId.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ticket.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDomain) {
      filtered = filtered.filter(ticket => ticket.domain === selectedDomain);
    }

    if (selectedStatus) {
      filtered = filtered.filter(ticket => ticket.status === selectedStatus);
    }

    filtered.sort((a, b) => {
      const fieldA = a[sort.field as keyof Ticket];
      const fieldB = b[sort.field as keyof Ticket];
      if (sort.order === "asc") {
        return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
      } else {
        return fieldA > fieldB ? -1 : fieldA < fieldB ? 1 : 0;
      }
    });

    setFilteredTickets(filtered);
  };

  useEffect(() => {
    applyFilters(tickets);
  }, [searchQuery, tickets, selectedDomain, selectedStatus, sort]);

  const fetchTicketDetail = (ticket: Ticket): void => {
    setSelectedTicket(ticket);
    setActiveView("ticket-detail");
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getPriorityBadge = (score: number): JSX.Element => {
    if (score <= 30) {
      return <Badge className="bg-green-50 text-green-800 border-green-500">Low</Badge>;
    } else if (score <= 70) {
      return <Badge className="bg-yellow-50 text-yellow-800 border-yellow-500">Medium</Badge>;
    } else {
      return <Badge className="bg-red-50 text-red-800 border-red-500">High</Badge>;
    }
  };

  const getStatusBadge = (status: string): JSX.Element => {
    switch (status) {
      case "Open":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-500">Open</Badge>;
      case "In Progress":
        return (
          <Badge className="bg-yellow-50 text-yellow-800 border-yellow-500">In Progress</Badge>
        );
      case "Queued":
        return <Badge className="bg-red-50 text-red-800 border-red-500">Queued</Badge>;
      case "On Hold":
        return <Badge className="bg-orange-50 text-orange-800 border-orange-500">On Hold</Badge>;
      case "Completed":
        return <Badge className="bg-green-50 text-green-800 border-green-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTicketAgeColor = (ticket: Ticket): string => {
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (ticket.status === "Completed") {
      return "bg-green-50 text-green-800"; // Green for resolved tickets
    } else if (hoursDiff > 24) {
      return "bg-red-50 text-red-800"; // Red for unresolved tickets older than 24 hours
    }
    return "bg-gray-50 text-gray-800"; // Default for tickets within 24 hours
  };

  const getDepartmentStats = () => {
    const stats: Record<string, { total: number; open: number; completed: number }> = {};
    tickets.forEach(ticket => {
      if (!stats[ticket.domain]) {
        stats[ticket.domain] = { total: 0, open: 0, completed: 0 };
      }
      stats[ticket.domain].total++;
      if (ticket.status === "Completed") {
        stats[ticket.domain].completed++;
      } else {
        stats[ticket.domain].open++;
      }
    });
    return stats;
  };

  const getAssignedEmployees = () => {
    const employeeMap: Record<string, Set<string>> = {};
    tickets.forEach(ticket => {
      if (ticket.assignedEmployees.length > 0) {
        if (!employeeMap[ticket.domain]) {
          employeeMap[ticket.domain] = new Set();
        }
        ticket.assignedEmployees.forEach(emp => {
          const employee = employees.find(e => e.id === emp.employeeId);
          if (employee) {
            employeeMap[ticket.domain].add(`${employee.name} (${emp.employeeId})`);
          }
        });
      }
    });
    return employeeMap;
  };

  const getCustomerFeedback = () => {
    return tickets
      .filter(ticket => ticket.status === "Completed" && ticket.customerFeedback)
      .map(ticket => ({
        ticketId: ticket.ticketId,
        domain: ticket.domain,
        feedback: ticket.customerFeedback,
        closedAt: ticket.closedAt!,
      }));
  };

  useEffect(() => {
    // Handle window resize to automatically open sidebar on larger screens
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away to set initial state
    handleResize();

    // Clean up on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Toaster position="top-right" />

      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-200 flex flex-col ${
          sidebarOpen ? "w-64" : "w-0 -ml-64"
        }`}
      >
        <div className="h-16 flex items-center justify-center border-b px-4 bg-blue-50">
          <div className="flex items-center space-x-2">
            <img
              src="https://sjc.microlink.io/gf8RQ7PirAEbOp6znEDgM-iULJEDvBNU-SlSoGlSsdm59zQZnT0LGChq8VCO-pmyv0gazxOD6q-bzVvywzuSJw.jpeg"
              alt="VYOM Logo"
              className="h-10 w-auto"
              onError={e => {
                e.currentTarget.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJDMiAxNy41MiA2LjQ4IDIyIDEyIDIyQzE3LjUyIDIyIDIyIDE3LjUyIDIyIDEyQzIyIDYuNDggMTcuNTIgMiAxMiAyWk0xMiA1QzEzLjY2IDUgMTUgNi4zNCAxNSA4QzE1IDkuNjYgMTMuNjYgMTEgMTIgMTFDMTAuMzQgMTEgOSA5LjY2IDkgOEM5IDYuMzQgMTAuMzQgNSAxMiA1Wk0xMiAxOUM5LjUgMTkgNy4yOSAxNy45MiA2IDE2LjE4QzYuMDMgMTQuMTIgMTAgMTMgMTIgMTNDMTMuOTkgMTMgMTcuOTcgMTQuMTIgMTggMTYuMThDMTYuNzEgMTcuOTIgMTQuNSAxOSAxMiAxOVoiIGZpbGw9IiNFNDI5MjkiLz48L3N2Zz4=";
              }}
            />
            <div className="text-lg font-bold">
              <span className="text-blue-800">VYOM</span>
              <span className="text-red-600"> Saksham</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            <Button
              variant={activeView === "dashboard" ? "secondary" : "ghost"}
              className="w-full justify-start text-blue-800 hover:bg-blue-50"
              onClick={() => setActiveView("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              variant={activeView === "tickets" ? "secondary" : "ghost"}
              className="w-full justify-start text-blue-800 hover:bg-blue-50"
              onClick={() => {
                setActiveView("tickets");
                setSelectedTicket(null);
              }}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Tickets
            </Button>

            <Separator className="my-2" />

            <Button
              variant={activeView === "reports" ? "secondary" : "ghost"}
              className="w-full justify-start text-blue-800 hover:bg-blue-50"
              onClick={() => setActiveView("reports")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>

            <Button variant="ghost" className="w-full justify-start text-blue-800 hover:bg-blue-50">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-red-500 text-white">VY</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-red-600">VYOM Manager</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="focus:outline-none"
            >
              <Menu className="h-5 w-5 text-blue-800" />
            </Button>
            <div className="ml-4">
              <h1 className="text-lg font-semibold text-blue-800">
                {activeView === "dashboard" && "VYOM Manager Dashboard"}
                {activeView === "tickets" && "VYOM Tickets"}
                {activeView === "ticket-detail" && `VYOM Ticket: ${selectedTicket?.ticketId}`}
                {activeView === "reports" && "VYOM Reports & Insights"}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserCircle className="h-5 w-5 text-red-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem className="text-red-800">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          {activeView === "dashboard" && (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* First Row: Department-wise Ticket Overview and Assigned Employees */}
                <Card className="shadow-md">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-blue-800">Department-wise Ticket Overview</CardTitle>
                    <CardDescription className="text-blue-600">
                      Tickets by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTickets ? (
                      <Skeleton className="h-40 w-full" />
                    ) : tickets.length === 0 ? (
                      <p className="text-sm text-gray-500">No tickets available.</p>
                    ) : (
                      <ScrollArea className="max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50">
                              <TableHead className="text-blue-800">Department</TableHead>
                              <TableHead className="text-blue-800">Total</TableHead>
                              <TableHead className="text-blue-800">Open</TableHead>
                              <TableHead className="text-blue-800">Completed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(getDepartmentStats()).map(([domain, stats]) => (
                              <TableRow key={domain}>
                                <TableCell>{domain.split(" & ")[0]}</TableCell>
                                <TableCell>{stats.total}</TableCell>
                                <TableCell className="text-red-800">{stats.open}</TableCell>
                                <TableCell className="text-green-800">{stats.completed}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="text-red-600">Assigned Employees by Department</CardTitle>
                    <CardDescription className="text-red-500">
                      Employees working on tickets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTickets ? (
                      <Skeleton className="h-40 w-full" />
                    ) : tickets.length === 0 ? (
                      <p className="text-sm text-gray-500">No tickets available.</p>
                    ) : (
                      <ScrollArea className="max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-50">
                              <TableHead className="text-red-600">Department</TableHead>
                              <TableHead className="text-red-600">Assigned Employees</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(getAssignedEmployees()).map(([domain, empSet]) => (
                              <TableRow key={domain}>
                                <TableCell>{domain.split(" & ")[0]}</TableCell>
                                <TableCell>
                                  {empSet.size > 0 ? Array.from(empSet).join(", ") : "None"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Second Row: Customer Feedback */}
              <div className="grid grid-cols-1 gap-6 mt-6">
                <Card className="shadow-md">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-green-800">Customer Feedback</CardTitle>
                    <CardDescription className="text-green-600">
                      Feedback from resolved issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTickets ? (
                      <Skeleton className="h-40 w-full" />
                    ) : tickets.length === 0 ? (
                      <p className="text-sm text-gray-500">No tickets available.</p>
                    ) : getCustomerFeedback().length === 0 ? (
                      <p className="text-sm text-gray-500">No feedback available yet.</p>
                    ) : (
                      <ScrollArea className="max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50">
                              <TableHead className="text-green-800">Ticket ID</TableHead>
                              <TableHead className="text-green-800">Department</TableHead>
                              <TableHead className="text-green-800">Feedback</TableHead>
                              <TableHead className="text-green-800">Closed At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getCustomerFeedback().map(feedback => (
                              <TableRow key={feedback.ticketId}>
                                <TableCell>{feedback.ticketId}</TableCell>
                                <TableCell>{feedback.domain.split(" & ")[0]}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {feedback.feedback}
                                </TableCell>
                                <TableCell>{formatDate(feedback.closedAt)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "tickets" && (
            <div className="p-6">
              <Card className="shadow-md">
                <CardHeader className="bg-blue-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-blue-800">All Service Tickets</CardTitle>
                      <CardDescription className="text-blue-600">
                        View and monitor all customer service tickets
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Search tickets..."
                          className="pl-8 w-full sm:w-[240px] border-blue-200"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex gap-2 border-blue-500 text-blue-800"
                          >
                            <Filter className="h-4 w-4" />
                            <span>Filter</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm text-blue-800">Filter Tickets</h4>
                            <div className="space-y-2">
                              <Label htmlFor="domain" className="text-blue-800">
                                Department
                              </Label>
                              <Select
                                value={selectedDomain || ""}
                                onValueChange={value => setSelectedDomain(value || null)}
                              >
                                <SelectTrigger className="border-blue-200">
                                  <SelectValue placeholder="All departments" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All departments</SelectItem>
                                  <SelectItem value="Retail Banking & Customer Support">
                                    Retail Banking
                                  </SelectItem>
                                  <SelectItem value="Loan & Credit Department">
                                    Loan & Credit
                                  </SelectItem>
                                  <SelectItem value="Payments & Clearing Department">
                                    Payments & Clearing
                                  </SelectItem>
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
                              <Label htmlFor="status" className="text-blue-800">
                                Status
                              </Label>
                              <Select
                                value={selectedStatus || ""}
                                onValueChange={value => setSelectedStatus(value || null)}
                              >
                                <SelectTrigger className="border-blue-200">
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
                              <Label htmlFor="sort" className="text-blue-800">
                                Sort By
                              </Label>
                              <Select
                                value={`${sort.field}:${sort.order}`}
                                onValueChange={value => {
                                  const [field, order] = value.split(":") as [
                                    string,
                                    "asc" | "desc"
                                  ];
                                  setSort({ field, order });
                                }}
                              >
                                <SelectTrigger className="border-blue-200">
                                  <SelectValue placeholder="Sort tickets" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="createdAt:desc">Newest first</SelectItem>
                                  <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                                  <SelectItem value="priorityScore:desc">
                                    Highest priority
                                  </SelectItem>
                                  <SelectItem value="priorityScore:asc">Lowest priority</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-between">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-800"
                                onClick={() => {
                                  setSelectedDomain(null);
                                  setSelectedStatus(null);
                                  setSort({ field: "createdAt", order: "desc" });
                                  applyFilters(tickets);
                                }}
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={() => applyFilters(tickets)}
                              >
                                Apply Filters
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="rounded-md border max-h-[500px] overflow-x-auto">
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead className="text-blue-800">Ticket ID</TableHead>
                          <TableHead className="text-blue-800">Customer</TableHead>
                          <TableHead className="text-blue-800 max-w-[300px]">
                            Issue Description
                          </TableHead>
                          <TableHead className="text-blue-800">Department</TableHead>
                          <TableHead className="text-blue-800">Created</TableHead>
                          <TableHead className="text-blue-800">Status</TableHead>
                          <TableHead className="text-blue-800">Priority</TableHead>
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
                              </TableRow>
                            ))
                        ) : filteredTickets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                              No tickets found matching your criteria.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTickets.map(ticket => (
                            <TableRow
                              key={ticket._id}
                              className={`cursor-pointer hover:bg-gray-100 ${getTicketAgeColor(
                                ticket
                              )}`}
                              onClick={() => fetchTicketDetail(ticket)}
                            >
                              <TableCell className="font-medium">{ticket.ticketId}</TableCell>
                              <TableCell>
                                {ticket.userId.firstName} {ticket.userId.lastName}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {ticket.issueDescription}
                              </TableCell>
                              <TableCell>{ticket.domain.split(" & ")[0]}</TableCell>
                              <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                              <TableCell>{getPriorityBadge(ticket.priorityScore)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "ticket-detail" && selectedTicket && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-md">
                  <CardHeader className="flex flex-row items-start justify-between bg-blue-50">
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-2 text-blue-800"
                        onClick={() => setActiveView("tickets")}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to Tickets
                      </Button>
                      <CardTitle className="text-xl text-blue-800">
                        Ticket: {selectedTicket.ticketId}
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Created on {formatDate(selectedTicket.createdAt)}
                      </CardDescription>
                    </div>
                    <div>{getStatusBadge(selectedTicket.status)}</div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">Department</p>
                          <p className="text-base text-blue-800">{selectedTicket.domain}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm font-medium">Priority</p>
                          <div className="mt-1">
                            {getPriorityBadge(selectedTicket.priorityScore)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-500 text-sm font-medium mb-1">Issue Description</p>
                      <div className="p-3 bg-gray-100 rounded-md">
                        <p className="whitespace-pre-wrap text-sm text-gray-800">
                          {selectedTicket.issueDescription}
                        </p>
                      </div>
                    </div>

                    {selectedTicket.attachedFileId && (
                      <div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Attachment</p>
                        <div className="p-3 bg-gray-100 rounded-md flex items-center">
                          <File className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-800">
                            {selectedTicket.attachedFileId}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto border-blue-500 text-blue-800"
                            onClick={() => {
                              window.open(
                                `http://localhost:5000/api/media/${selectedTicket.attachedFileId}`,
                                "_blank"
                              );
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-500 text-sm font-medium mb-1">Work History</p>
                      {selectedTicket.assignedEmployees.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTicket.assignedEmployees.map((emp, idx) => {
                            const employee = employees.find(e => e.id === emp.employeeId) || {
                              name: "Unknown",
                            };
                            return (
                              <div key={idx} className="p-3 bg-gray-100 rounded-md">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-red-600">
                                    Employee: {employee.name} ({emp.employeeId})
                                  </span>
                                  <span className="text-gray-500">
                                    {formatDate(emp.assignedAt)}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap text-gray-800">
                                  {emp.workDone || "No details provided"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-100 rounded-md">
                          <p className="text-sm text-gray-500">No work updates yet</p>
                        </div>
                      )}
                    </div>

                    {selectedTicket.closedAt && (
                      <div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Resolution</p>
                        <div className="p-3 bg-green-50 rounded-md">
                          <p className="text-sm text-green-800">
                            <strong>Closed At:</strong> {formatDate(selectedTicket.closedAt)}
                          </p>
                          {selectedTicket.summaryOfWork && (
                            <p className="text-sm mt-1 text-green-800">
                              <strong>Summary:</strong> {selectedTicket.summaryOfWork}
                            </p>
                          )}
                          {selectedTicket.customerFeedback && (
                            <p className="text-sm mt-1 text-green-800">
                              <strong>Feedback:</strong> {selectedTicket.customerFeedback}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="text-red-600">Assigned Employees</CardTitle>
                    <CardDescription className="text-red-500">
                      Details of employees working on this ticket
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTicket.assignedEmployees.length > 0 ? (
                      selectedTicket.assignedEmployees.map(emp => {
                        const employee = employees.find(e => e.id === emp.employeeId) || {
                          name: "Unknown",
                          domains: [],
                        };
                        return (
                          <div key={emp.employeeId} className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src="/placeholder.svg" />
                                <AvatarFallback className="bg-red-500 text-white">
                                  {employee.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-red-600">
                                  {employee.name} ({emp.employeeId})
                                </p>
                                <p className="text-xs text-gray-500">
                                  Assigned: {formatDate(emp.assignedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-800">
                              <p>
                                <strong>Domains:</strong> {employee.domains.join(", ")}
                              </p>
                              <p>
                                <strong>Status:</strong> {employee.isFree ? "Free" : "Busy"}
                              </p>
                              {employee.currentTicket && (
                                <p>
                                  <strong>Current Ticket:</strong> {employee.currentTicket.ticketId}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No employees assigned yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "reports" && (
            <div className="p-6">
              <InsightsDashboard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboard;
