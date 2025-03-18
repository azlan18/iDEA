"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, X, Send, RefreshCw, Loader2, ChevronDown, User, Bot } from "lucide-react"

interface Message {
  sender: "user" | "bot"
  text: string
  timestamp: Date
}

interface ChatProps {
  isOpen: boolean
  onToggle: () => void
}

const Chat: React.FC<ChatProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I'm your Union Bank virtual assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [needsHumanSupport, setNeedsHumanSupport] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID on component mount
  useEffect(() => {
    const newSessionId = crypto.randomUUID()
    setSessionId(newSessionId)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, isMinimized])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
  }, [isOpen, isMinimized])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      sender: "user",
      text: input,
      timestamp: new Date(),
    }

    setInput("")
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        sessionId: sessionId,
        userQuery: input,
      })

      const botMessage: Message = {
        sender: "bot",
        text: response.data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])

      // Set the human support flag based on the response
      setNeedsHumanSupport(response.data.needsHumanSupport)
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I'm having trouble connecting to our servers. Please try again later or contact customer support.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const resetChat = async () => {
    try {
      // Call the clear-chat endpoint
      await axios.post("http://localhost:5000/api/chat/clear", {
        sessionId: sessionId,
      })

      // Generate a new session ID
      const newSessionId = crypto.randomUUID()
      setSessionId(newSessionId)

      // Reset human support flag
      setNeedsHumanSupport(false)

      // Clear messages and add system message
      setMessages([
        {
          sender: "bot",
          text: "Chat history has been cleared. How can I help you today?",
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Error resetting chat:", error)
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error resetting chat history. Please try again.",
          timestamp: new Date(),
        },
      ])
    }
  }

  const redirectToHumanSupport = () => {
    // Store the current chat history in local storage
    localStorage.setItem("chatHistory", JSON.stringify(messages))
    localStorage.setItem("chatSessionId", sessionId)

    // Redirect to the record-query page
    navigate("/record-query")
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Chat bubble animation variants
  const bubbleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  }

  // Chat container animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  }

  // Minimized chat header variants
  const minimizedVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1,
        duration: 0.2,
      },
    },
  }

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial="hidden"
          animate="visible"
          variants={bubbleVariants}
        >
          <Button
            onClick={onToggle}
            className="h-14 w-14 rounded-full bg-gradient-to-r from-red-600 to-blue-600 shadow-lg hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            1
          </span>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ height: isMinimized ? "auto" : "520px" }}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-red-600 to-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarImage src="/union-bank-logo.svg" />
                  <AvatarFallback className="bg-white text-blue-600 font-bold">UB</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">Union Bank Assistant</h3>
                  {!isMinimized && (
                    <div className="flex items-center text-xs">
                      <span className="flex h-2 w-2 rounded-full bg-green-400 mr-1"></span>
                      Online
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-white hover:bg-white/20"
                  onClick={toggleMinimize}
                >
                  {isMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-white hover:bg-white/20"
                  onClick={onToggle}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Minimized State */}
            {isMinimized && (
              <motion.div className="p-3" initial="hidden" animate="visible" variants={minimizedVariants}>
                <p className="text-sm text-gray-600">Chat with our virtual assistant for quick help.</p>
              </motion.div>
            )}

            {/* Chat Body - Only show when not minimized */}
            {!isMinimized && (
              <>
                <div className="flex-1 p-4 overflow-y-auto h-[380px]">
                  {messages.map((msg, index) => (
                    <div key={index} className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.sender === "bot" && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%]`}>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.sender === "user"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              p: ({ children }) => <p className="text-sm">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-md font-semibold my-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-medium my-1">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc pl-5 my-2 text-sm">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 my-2 text-sm">{children}</ol>,
                              li: ({ children }) => <li className="ml-2 text-sm">{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 pl-2 italic text-sm opacity-80 my-2">
                                  {children}
                                </blockquote>
                              ),
                              code: ({ children }) => (
                                <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`underline hover:opacity-80 ${
                                    msg.sender === "user" ? "text-white" : "text-blue-600"
                                  }`}
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 px-1">{formatTime(msg.timestamp)}</div>
                      </div>
                      {msg.sender === "user" && (
                        <Avatar className="h-8 w-8 ml-2 mt-1">
                          <AvatarFallback className="bg-blue-600 text-white">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[70%]">
                        <div className="flex space-x-2">
                          <div
                            className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "600ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Human Support Button - Only show when needed */}
                {needsHumanSupport && (
                  <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">This query requires human assistance</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Connect with a bank representative for personalized help
                        </p>
                      </div>
                      <Button
                        onClick={redirectToHumanSupport}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1 h-auto"
                        size="sm"
                      >
                        Connect Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Chat Actions */}
                <div className="p-2 border-t flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50"
                    onClick={resetChat}
                    title="Reset conversation"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 mx-2">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="border-gray-300 focus:border-blue-500 rounded-full bg-gray-50"
                      placeholder="Type a message..."
                    />
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className={`h-9 w-9 rounded-full ${
                      input.trim()
                        ? "bg-gradient-to-r from-red-600 to-blue-600 hover:opacity-90"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Chat

