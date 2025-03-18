import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, ShoppingBag, Zap } from "lucide-react"

// Mock data for transactions
const mockTransactions = [
  {
    id: "tx-1234",
    description: "Amazon.in",
    amount: 2499,
    type: "debit",
    category: "Shopping",
    date: "2023-12-16T14:30:00Z",
  },
  {
    id: "tx-1235",
    description: "Salary Credit",
    amount: 65000,
    type: "credit",
    category: "Income",
    date: "2023-12-15T10:15:00Z",
  },
  {
    id: "tx-1236",
    description: "Electricity Bill",
    amount: 1850,
    type: "debit",
    category: "Utilities",
    date: "2023-12-14T16:45:00Z",
  },
  {
    id: "tx-1237",
    description: "Swiggy",
    amount: 450,
    type: "debit",
    category: "Food",
    date: "2023-12-14T13:20:00Z",
  },
  {
    id: "tx-1238",
    description: "Mobile Recharge",
    amount: 699,
    type: "debit",
    category: "Utilities",
    date: "2023-12-13T09:10:00Z",
  },
]

// Format date
const formatTransactionDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

// Get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Shopping":
      return <ShoppingBag className="h-4 w-4" />
    case "Income":
      return <DollarSign className="h-4 w-4" />
    case "Utilities":
      return <Zap className="h-4 w-4" />
    case "Food":
      return <ShoppingBag className="h-4 w-4" />
    default:
      return <CreditCard className="h-4 w-4" />
  }
}

export const RecentTransactions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest account activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
              <div className="flex items-center">
                <div
                  className={`p-2 rounded-full mr-3 ${transaction.type === "credit" ? "bg-green-100" : "bg-blue-100"}`}
                >
                  {getCategoryIcon(transaction.category)}
                </div>
                <div>
                  <h4 className="font-medium">{transaction.description}</h4>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-2 px-1 py-0 text-xs">
                      {transaction.category}
                    </Badge>
                    <span>{formatTransactionDate(transaction.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`font-medium ${transaction.type === "credit" ? "text-green-600" : "text-gray-900"}`}>
                  {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                </span>
                <div
                  className={`ml-2 p-1 rounded-full ${transaction.type === "credit" ? "bg-green-100" : "bg-red-100"}`}
                >
                  {transaction.type === "credit" ? (
                    <ArrowUpRight
                      className={`h-3 w-3 ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}
                    />
                  ) : (
                    <ArrowDownLeft className="h-3 w-3 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button variant="outline" className="w-full">
          View All Transactions
        </Button>
      </CardFooter>
    </Card>
  )
}

