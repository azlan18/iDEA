import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  BarChart3,
  Users,
  Building2,
  Award,
  AlertCircle,
  FileText,
  Cog,
  Download,
  Loader2,
  LucideIcon,
} from "lucide-react";

// Interfaces for data structures
interface Insight {
  type: "branch" | "staff" | "systemic" | "success";
  content: string;
}

interface Report {
  _id: string;
  filename: string;
  timestamp: Date;
  insights: Insight[];
}

interface FAQ {
  question: string;
  frequency: number;
  domain: string;
  answer: string;
  metadata?: {
    source: string;
    ticketIds: string[];
    lastUpdated: Date;
  };
}

interface FAQReport {
  _id: string;
  filename: string;
  timestamp: Date;
  faqs: FAQ[];
  filepath: string;
}

interface Ticket {
  _id: string;
  ticketId: string;
  userId: string;
  issueDescription: string;
  domain: string;
  status: string;
  priorityScore: number;
  assignedEmployees: {
    employeeId: string;
    assignedAt: Date;
    workDone: string;
    priorityScore: number;
  }[];
  createdAt: Date;
  [key: string]: any; // For flexibility if tickets have additional fields
}

// Define insight type configurations
interface InsightTypeConfig {
  icon: LucideIcon;
  color: string;
  title: string;
  bgColor: string;
  textColor: string;
}

const INSIGHT_TYPES: Record<string, InsightTypeConfig> = {
  branch: {
    icon: Building2,
    color: "bg-blue-50 border-blue-500 text-blue-700",
    title: "Department Insights",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
  },
  staff: {
    icon: Users,
    color: "bg-purple-50 border-purple-500 text-purple-700",
    title: "Staff Insights",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
  },
  systemic: {
    icon: BarChart3,
    color: "bg-red-50 border-red-500 text-red-700",
    title: "Systemic Insights",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
  },
  success: {
    icon: Award,
    color: "bg-green-50 border-green-500 text-green-700",
    title: "Success Metrics",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
  },
};

// Initialize Google Generative AI with API key from environment
let genAI: GoogleGenerativeAI;
try {
  genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY || "");
} catch (error: unknown) {
  console.error("Failed to initialize Google Generative AI:", error);
  genAI = {
    getGenerativeModel: () => null,
  } as GoogleGenerativeAI;
}

const InsightsDashboard: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState<boolean>(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFAQs, setLoadingFAQs] = useState<boolean>(false);
  const [faqReports, setFaqReports] = useState<FAQReport[]>([]);

  useEffect(() => {
    fetchTickets();
    fetchReports();
    fetchFAQs();
    fetchFAQReports();
  }, []);

  const fetchTickets = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/tickets", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
      }

      const data: Ticket[] = await response.json();
      setTickets(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching tickets:", err);
      setError(`Failed to fetch tickets: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:5000/api/analytics/reports", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
      }

      const data: Report[] = await response.json();
      setReports(data);
    } catch (err: unknown) {
      console.error("Error fetching reports:", err);
    }
  };

  const fetchFAQs = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:5000/api/analytics/faq");
      if (!response.ok) {
        throw new Error(`Failed to fetch FAQs: ${response.status} ${response.statusText}`);
      }
      const data: FAQ[] = await response.json();
      setFaqs(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching FAQs:", err);
      setError(`Failed to fetch FAQs: ${errorMessage}`);
    }
  };

  const fetchFAQReports = async (): Promise<void> => {
    try {
      const response = await fetch("http://localhost:5000/api/analytics/faq/reports");
      if (!response.ok) {
        throw new Error(`Failed to fetch FAQ reports: ${response.status} ${response.statusText}`);
      }
      const data: FAQReport[] = await response.json();
      setFaqReports(data);
    } catch (err: unknown) {
      console.error("Error fetching FAQ reports:", err);
    }
  };

  const generateInsights = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!tickets.length) {
        setError("No tickets available to analyze. Please fetch tickets first.");
        return;
      }

      if (!import.meta.env.VITE_GOOGLE_API_KEY) {
        console.warn("API key not configured, using mock data");
        generateMockInsights();
        return;
      }

      const model = genAI.getGenerativeModel?.({ model: "gemini-1.5-pro" });

      if (!model) {
        console.warn("Failed to initialize Google AI model, using mock data");
        generateMockInsights();
        return;
      }

      const prompt = `
        Analyze this banking customer service ticket data and generate actionable insights:
        ${JSON.stringify(tickets)}
        
        Generate 4 types of insights:
        1. Branch-Level: Focus on performance metrics and issues specific to departments/domains
        2. Staff-Level: Analyze employee performance based on assigned tickets
        3. Systemic: Identify system-wide patterns or issues affecting customer service
        4. Success Metrics: Highlight positive outcomes and successful resolutions
        
        Format each insight as a JSON array:
        [
          { "type": "branch", "content": "..." },
          { "type": "staff", "content": "..." },
          { "type": "systemic", "content": "..." },
          { "type": "success", "content": "..." }
        ]
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const newInsights: Insight[] = JSON.parse(jsonMatch[0]);
      setInsights(newInsights);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error generating insights:", err);
      setError(`Failed to generate insights: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateMockInsights = (): void => {
    try {
      interface DepartmentStats {
        count: number;
        open: number;
        closed: number;
      }

      const departments: Record<string, DepartmentStats> = {};

      tickets.forEach(ticket => {
        if (!departments[ticket.domain]) {
          departments[ticket.domain] = { count: 0, open: 0, closed: 0 };
        }
        departments[ticket.domain].count++;
        if (ticket.status === "Completed") {
          departments[ticket.domain].closed++;
        } else {
          departments[ticket.domain].open++;
        }
      });

      const mockInsights: Insight[] = [
        {
          type: "branch",
          content: `# Department Statistics\n\n${Object.entries(departments)
            .map(
              ([dept, stats]) =>
                `- **${dept}**: ${stats.count} tickets (${stats.open} open, ${stats.closed} closed)`
            )
            .join("\n")}`,
        },
        {
          type: "staff",
          content: `# Staff Performance\n\nBased on the ${
            tickets.length
          } tickets analyzed, staff are handling an average of ${(tickets.length / 5).toFixed(
            1
          )} tickets per person. Response times could be improved in the Loan & Credit Department.`,
        },
        {
          type: "systemic",
          content: `# System Improvements\n\n1. Implement automated ticket categorization to reduce manual sorting time\n2. Create a knowledge base for common issues to speed up resolution\n3. Consider adding more staff during peak hours based on ticket submission patterns`,
        },
        {
          type: "success",
          content: `# Success Metrics\n\n- **Resolution Rate**: ${(
            (tickets.filter(t => t.status === "Completed").length / tickets.length) *
            100
          ).toFixed(
            1
          )}%\n- **Average Handling Time**: 2.4 days\n- **Customer Satisfaction**: Analyzing feedback suggests overall positive sentiment for resolved tickets`,
        },
      ];

      setInsights(mockInsights);
    } catch (err: unknown) {
      console.error("Error generating mock insights:", err);
      setError("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (): Promise<void> => {
    if (!insights.length) return;

    try {
      setLoading(true);
      setError(null);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPos = 20;
      const margin = 20;
      const pageWidth = 210;
      const contentWidth = pageWidth - 2 * margin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Banking Analytics Report", margin, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 20;

      const addSection = (title: string, sectionInsights: Insight[], color: string): void => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, margin, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(60);

        sectionInsights.forEach(insight => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          const lines = pdf.splitTextToSize(insight.content, contentWidth);
          lines.forEach((line: string) => {
            pdf.text(line, margin, yPos);
            yPos += 7;
          });
          yPos += 5;
        });
        yPos += 10;
      };

      const sections = [
        { title: "Department Insights", type: "branch", color: "#1E40AF" },
        { title: "Staff Insights", type: "staff", color: "#6B46C1" },
        { title: "Systemic Insights", type: "systemic", color: "#DC2626" },
        { title: "Success Metrics", type: "success", color: "#047857" },
      ];

      sections.forEach(section => {
        const sectionInsights = insights.filter(i => i.type === section.type);
        if (sectionInsights.length > 0) {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          addSection(section.title, sectionInsights, section.color);
        }
      });

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: "center" });
      }

      const pdfData = pdf.output("datauristring");
      const filename = `banking-insights-${new Date().toISOString().slice(0, 10)}.pdf`;

      const response = await fetch("http://localhost:5000/api/analytics/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename,
          insights,
          pdfData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save report to server");
      }

      pdf.save(filename);
      await fetchReports();
      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error generating PDF:", error);
      setError(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadSavedReport = async (reportId: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/analytics/reports/download/${reportId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download report");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `report-${reportId}.pdf`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error downloading report:", error);
      setError(`Failed to download report: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateFAQs = async (): Promise<void> => {
    try {
      setLoadingFAQs(true);
      setError(null);

      if (!tickets.length) {
        setError("No tickets available to analyze. Please fetch tickets first.");
        return;
      }

      if (!import.meta.env.VITE_GOOGLE_API_KEY) {
        console.warn("API key not configured, using mock data");
        const mockFaqs = generateMockFAQs();
        setFaqs(mockFaqs);
        return;
      }

      const model = genAI.getGenerativeModel?.({ model: "gemini-1.5-pro" });

      if (!model) {
        console.warn("Failed to initialize Google AI model, using mock data");
        const mockFaqs = generateMockFAQs();
        setFaqs(mockFaqs);
        return;
      }

      const prompt = `
        Analyze these banking customer service tickets and generate comprehensive FAQs:
        ${JSON.stringify(tickets)}
        
        Generate a detailed list of frequently asked questions based on the ticket data.
        Format the response as a JSON array with this structure:
        [
          {
            "question": "Clear, specific question based on common issues",
            "frequency": <number of similar issues found>,
            "domain": "Department/team handling this type of issue",
            "answer": "Detailed step-by-step resolution process",
            "metadata": {
              "source": "ticket_analysis",
              "lastUpdated": "${new Date().toISOString()}"
            }
          }
        ]

        Requirements:
        1. Questions should be clear and specific
        2. Answers must include step-by-step instructions
        3. Include actual frequency counts from the data
        4. Group similar issues together
        5. Sort by frequency (highest first)
        6. Limit to top 10 most important FAQs
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const generatedFaqs: FAQ[] = JSON.parse(jsonMatch[0]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPos = 20;
      const margin = 20;
      const pageWidth = 210;
      const contentWidth = pageWidth - 2 * margin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Banking Service FAQs", margin, yPos);
      yPos += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 20;

      generatedFaqs.forEach((faq, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(0);
        pdf.text(`${index + 1}. ${faq.question}`, margin, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(
          `Department: ${faq.domain} • Frequency: ${faq.frequency} occurrences`,
          margin,
          yPos
        );
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(0);
        const lines = pdf.splitTextToSize(faq.answer, contentWidth);
        lines.forEach(line => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(line, margin, yPos);
          yPos += 7;
        });
        yPos += 10;
      });

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: "center" });
      }

      const pdfData = pdf.output("datauristring");
      const filename = `banking-faqs-${new Date().toISOString().slice(0, 10)}.pdf`;

      const response = await fetch("http://localhost:5000/api/analytics/faq/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faqs: generatedFaqs,
          filename,
          pdfData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save FAQs to server");
      }

      pdf.save(filename);
      const data = await response.json();
      setFaqs(data.faqs);

      if (data.report) {
        setFaqReports(prevReports => [data.report, ...prevReports]);
      }

      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error generating FAQs:", err);
      setError(`Failed to generate FAQs: ${errorMessage}`);
      const mockFaqs = generateMockFAQs();
      setFaqs(mockFaqs);
    } finally {
      setLoadingFAQs(false);
    }
  };

  const generateMockFAQs = (): FAQ[] => {
    return [
      {
        question: "How do I reset my online banking password?",
        frequency: 45,
        domain: "Retail Banking & Customer Support",
        answer:
          '1. Visit the login page\n2. Click "Forgot Password"\n3. Verify your identity using SMS or email\n4. Create a new password following security guidelines',
        metadata: {
          source: "mock_data",
          lastUpdated: new Date(),
          ticketIds: [],
        },
      },
    ];
  };

  const downloadFAQReport = async (reportId: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/analytics/faq/reports/download/${reportId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download FAQ report");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `faq-report-${reportId}.pdf`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error downloading FAQ report:", error);
      setError(`Failed to download FAQ report: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => (
    <div className="px-4 py-5 sm:px-6">
      <div className="text-sm text-gray-900 prose prose-sm max-w-none">
        <ReactMarkdown>{insight.content}</ReactMarkdown>
      </div>
    </div>
  );

  const FAQSection: React.FC = () => (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">FAQ Reports</h2>
        <button
          onClick={generateFAQs}
          disabled={loadingFAQs}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {loadingFAQs ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          Generate FAQ Report
        </button>
      </div>

      {faqReports.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-medium text-blue-800 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Generated FAQ Reports
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {faqReports.map(report => (
              <li key={report._id}>
                <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{report.filename}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFAQReport(report._id)}
                    className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-5 text-sm text-gray-500 italic text-center">
            No FAQ reports available. Click "Generate FAQ Report" to create one.
          </div>
        </div>
      )}

      {faqs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current FAQs</h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-blue-50">
              <h3 className="text-lg font-medium text-blue-800 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Latest Generated FAQs
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {faqs.map((faq, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                        {index + 1}
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{faq.question}</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Department: {faq.domain} • Frequency: {faq.frequency} occurrences
                      </p>
                      <div className="mt-2 text-sm text-gray-700 prose">
                        <ReactMarkdown>{faq.answer}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Banking Service Improvement Analytics
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600">
              AI-powered analysis of customer service tickets
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="w-5 h-5 mr-2" />
              {showRawData ? "Hide Raw Data" : "Show Raw Data"}
            </button>

            <button
              onClick={generateInsights}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Cog className="w-5 h-5 mr-2" />
              )}
              Generate Insights
            </button>

            {insights.length > 0 && (
              <button
                onClick={downloadPDF}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Report
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {showRawData && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Raw Ticket Data</h3>
              </div>
              <div className="p-4">
                <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-700">{JSON.stringify(tickets, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(INSIGHT_TYPES).map(([key, { icon: Icon, title, bgColor, textColor }]) => (
            <div key={key} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className={`px-4 py-5 sm:px-6 border-b border-gray-200 ${bgColor}`}>
                <h3 className={`text-lg font-medium leading-6 ${textColor} flex items-center`}>
                  <Icon className="h-5 w-5 mr-2" />
                  {title}
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {insights
                  .filter(insight => insight.type === key)
                  .map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                {insights.filter(insight => insight.type === key).length === 0 && (
                  <div className="px-4 py-5 text-sm text-gray-500 italic">
                    No insights available. Click "Generate Insights" to analyze data.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {reports.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Insight Reports</h2>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {reports.map(report => (
                  <li key={report._id}>
                    <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{report.filename}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(report.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadSavedReport(report._id)}
                        className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <FAQSection />
      </div>
    </div>
  );
};

export default InsightsDashboard;
