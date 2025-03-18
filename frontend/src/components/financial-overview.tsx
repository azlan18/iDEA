import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

interface FinancialOverviewProps {
  panData: any
}

export const FinancialOverview = ({ panData }: FinancialOverviewProps) => {
  // Use PAN data if available, otherwise use mock data
  const creditScore = panData?.credit_score || 680
  const avgMonthlySpend = panData?.spending_behavior?.avg_monthly_spend || 35000
  const spendingCategories = panData?.spending_behavior?.spending_categories || {
    Utilities: 20,
    Retail: 35,
    Travel: 15,
    Food: 30,
  }

  // Calculate credit score color and message
  const getCreditScoreInfo = (score: number) => {
    if (score >= 750) return { color: "text-green-600", message: "Excellent" }
    if (score >= 700) return { color: "text-blue-600", message: "Good" }
    if (score >= 650) return { color: "text-yellow-600", message: "Fair" }
    return { color: "text-red-600", message: "Needs Improvement" }
  }

  const creditScoreInfo = getCreditScoreInfo(creditScore)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Your financial health and spending patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="credit">Credit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <h3 className="text-2xl font-bold mt-1">₹1,24,500</h3>
                    </div>
                    <div className="bg-green-100 p-2 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>+5.2% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Spend</p>
                      <h3 className="text-2xl font-bold mt-1">₹{avgMonthlySpend.toLocaleString()}</h3>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs text-red-600">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    <span>-2.1% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Score</p>
                      <h3 className={`text-2xl font-bold mt-1 ${creditScoreInfo.color}`}>{creditScore}</h3>
                    </div>
                    <div className="bg-purple-100 p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    <span className={creditScoreInfo.color}>{creditScoreInfo.message}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-3">Active Loans</h4>
                {panData?.loan_history ? (
                  <div className="space-y-4">
                    {panData.loan_history
                      .filter((loan: any) => loan.status === "Active")
                      .map((loan: any, index: number) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{loan.type}</span>
                            <span className="text-sm font-medium">₹{loan.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>EMI: ₹{loan.emi}/month</span>
                            <span>Tenure: {loan.tenure}</span>
                          </div>
                          <Progress value={40} className="h-1.5" />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No active loans</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spending" className="pt-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-4">Spending by Category</h4>
                <div className="space-y-4">
                  {Object.entries(spendingCategories).map(([category, percentage]: [string, any]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{category}</span>
                        <span className="text-sm font-medium">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Payment Methods</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-blue-700">
                        {panData?.spending_behavior?.payment_mode_distribution?.UPI || "65"}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">UPI</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-purple-700">
                        {panData?.spending_behavior?.payment_mode_distribution?.["Credit Card"] || "25"}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Credit Card</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-green-700">
                        {panData?.spending_behavior?.payment_mode_distribution?.["Net Banking"] || "10"}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Net Banking</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credit" className="pt-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-medium">Credit Score</h4>
                    <p className={`text-3xl font-bold ${creditScoreInfo.color}`}>{creditScore}</p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      creditScore >= 750
                        ? "bg-green-100"
                        : creditScore >= 700
                          ? "bg-blue-100"
                          : creditScore >= 650
                            ? "bg-yellow-100"
                            : "bg-red-100"
                    }`}
                  >
                    {creditScore >= 750 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : creditScore >= 650 ? (
                      <TrendingUp className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>

                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="absolute inset-0 flex">
                    <div className="bg-red-500 h-full" style={{ width: "20%" }}></div>
                    <div className="bg-yellow-500 h-full" style={{ width: "20%" }}></div>
                    <div className="bg-blue-500 h-full" style={{ width: "20%" }}></div>
                    <div className="bg-green-500 h-full" style={{ width: "40%" }}></div>
                  </div>
                  <div
                    className="absolute h-full w-1 bg-white border-2 border-gray-800"
                    style={{ left: `${(creditScore - 300) / 6}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-6">
                  <span>Poor (300)</span>
                  <span>Fair (600)</span>
                  <span>Good (700)</span>
                  <span>Excellent (900)</span>
                </div>

                <div className="space-y-4 mt-6">
                  <h4 className="text-sm font-medium">Factors Affecting Your Score</h4>

                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="bg-green-100 p-1.5 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">On-time Payment History</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You've maintained a good record of on-time payments
                      </p>
                    </div>
                  </div>

                  {panData?.loan_history?.some((loan: any) => loan.status === "Defaulted") && (
                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <div className="bg-red-100 p-1.5 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Loan Defaults</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You have defaulted loans that are negatively impacting your score
                        </p>
                      </div>
                    </div>
                  )}

                  {(panData?.spending_behavior?.high_value_transactions > 5 || !panData) && (
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="bg-yellow-100 p-1.5 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">High Credit Utilization</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You're using a significant portion of your available credit
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

