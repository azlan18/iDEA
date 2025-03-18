import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, User, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react"

interface UserProfileCardProps {
  userData: any
  aadhaarData: any
  panData: any
}

export const UserProfileCard = ({ userData, aadhaarData, panData }: UserProfileCardProps) => {
  // Determine customer priority based on PAN data
  const determineCustomerPriority = () => {
    if (!panData) return "Standard"

    const creditScore = panData.credit_score || 0
    const avgMonthlySpend = panData.spending_behavior?.avg_monthly_spend || 0

    if (creditScore > 800 || avgMonthlySpend > 80000) return "Premium"
    if (creditScore > 700 || avgMonthlySpend > 40000) return "High"
    if (creditScore > 600 || avgMonthlySpend > 20000) return "Medium"
    return "Standard"
  }

  const customerPriority = determineCustomerPriority()

  const priorityColors = {
    Premium: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
    High: "bg-gradient-to-r from-blue-500 to-blue-700 text-white",
    Medium: "bg-gradient-to-r from-green-500 to-green-700 text-white",
    Standard: "bg-gradient-to-r from-gray-500 to-gray-700 text-white",
  }

  return (
    <Card className="overflow-hidden">
      <div className={`${priorityColors[customerPriority as keyof typeof priorityColors]} p-4`}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Customer Profile</h3>
          <Badge variant="outline" className="bg-white/20 text-white border-white/30">
            {customerPriority} Priority
          </Badge>
        </div>
      </div>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center mb-4">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarImage src={userData?.faceImage || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-white text-xl">
              {userData?.firstName?.[0]}
              {userData?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{userData?.fullName}</h2>
          <div className="flex items-center mt-1">
            <Badge variant="outline" className="mr-2 bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
            </Badge>
            <p className="text-sm text-muted-foreground">Customer since {new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{userData?.email}</span>
          </div>
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{userData?.phoneNumber}</span>
          </div>
          {aadhaarData && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm truncate">{aadhaarData.address}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">Aadhaar Verified</p>
            <p className="text-sm font-medium mt-1">
              {aadhaarData ? `XXXX-XXXX-${aadhaarData.aadhaarNumber.slice(-4)}` : "Not Linked"}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-red-700 font-medium">PAN Verified</p>
            <p className="text-sm font-medium mt-1">
              {panData ? `${panData.panNumber.slice(0, 2)}XXXX${panData.panNumber.slice(-2)}` : "Not Linked"}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-gray-50 flex justify-between">
        <Button variant="outline" size="sm">
          <User className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Security
        </Button>
      </CardFooter>
    </Card>
  )
}

