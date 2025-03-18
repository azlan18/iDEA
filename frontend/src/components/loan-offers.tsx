import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Home, Car, CreditCard, Briefcase, ArrowRight, AlertTriangle } from "lucide-react"

interface LoanOffersProps {
  panData?: any
}

export const LoanOffers = ({ panData }: LoanOffersProps) => {
  // Determine loan eligibility based on PAN data
  const determineEligibility = () => {
    if (!panData) return { eligible: true, maxAmount: 500000 }

    const creditScore = panData.credit_score || 0
    const hasDefaultedLoans = panData.loan_history?.some((loan: any) => loan.status === "Defaulted")

    if (hasDefaultedLoans) return { eligible: false, reason: "Loan defaults detected" }
    if (creditScore < 600) return { eligible: false, reason: "Low credit score" }

    // Calculate max loan amount based on credit score
    let maxAmount = 500000 // Base amount
    if (creditScore > 750) maxAmount = 2000000
    else if (creditScore > 700) maxAmount = 1000000
    else if (creditScore > 650) maxAmount = 750000

    return { eligible: true, maxAmount }
  }

  const eligibility = determineEligibility()

  // Mock loan offers
  const loanOffers = [
    {
      type: "Home Loan",
      interestRate: "8.50%",
      maxAmount: eligibility.eligible ? eligibility.maxAmount * 5 : 0,
      tenure: "Up to 20 years",
      icon: Home,
    },
    {
      type: "Car Loan",
      interestRate: "9.25%",
      maxAmount: eligibility.eligible ? eligibility.maxAmount * 0.8 : 0,
      tenure: "Up to 7 years",
      icon: Car,
    },
    {
      type: "Personal Loan",
      interestRate: "10.99%",
      maxAmount: eligibility.eligible ? eligibility.maxAmount : 0,
      tenure: "Up to 5 years",
      icon: Briefcase,
    },
    {
      type: "Credit Card",
      interestRate: "3.5% monthly",
      maxAmount: eligibility.eligible ? eligibility.maxAmount * 0.3 : 0,
      tenure: "Revolving",
      icon: CreditCard,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Offers</CardTitle>
        <CardDescription>Pre-approved offers based on your profile</CardDescription>
      </CardHeader>
      <CardContent>
        {eligibility.eligible ? (
          <div className="space-y-4">
            {loanOffers.map((loan, index) => (
              <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-blue-100 mr-3">
                    <loan.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{loan.type}</h4>
                    <p className="text-xs text-muted-foreground">
                      {loan.interestRate} • {loan.tenure}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Max Amount</span>
                    <span className="font-medium">₹{loan.maxAmount.toLocaleString()}</span>
                  </div>
                  <Progress value={70} className="h-1.5" />
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 justify-between">
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="bg-yellow-100 p-3 rounded-lg inline-block mb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium">Not Eligible for Loans</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {eligibility.reason || "You're currently not eligible for loan offers."}
            </p>
            <Button variant="outline" className="mt-4">
              Improve Credit Score
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button variant="outline" className="w-full">
          View All Offers
        </Button>
      </CardFooter>
    </Card>
  )
}

