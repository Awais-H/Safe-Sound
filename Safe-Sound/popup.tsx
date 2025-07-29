"use client"

import { useState } from "react"
import { Calendar, Clock, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Mock data for demonstration
const mockDailyData = [
  { hour: "1AM", level: 0 },
  { hour: "2AM", level: 0 },
  { hour: "3AM", level: 0 },
  { hour: "4AM", level: 0 },
  { hour: "5AM", level: 0 },
  { hour: "6AM", level: 0 },
  { hour: "7AM", level: 45 },
  { hour: "8AM", level: 52 },
  { hour: "9AM", level: 48 },
  { hour: "10AM", level: 55 },
  { hour: "11AM", level: 50 },
  { hour: "12PM", level: 58 },
  { hour: "1PM", level: 62 },
  { hour: "2PM", level: 48 },
  { hour: "3PM", level: 53 },
  { hour: "4PM", level: 47 },
  { hour: "5PM", level: 65 },
  { hour: "6PM", level: 42 },
  { hour: "7PM", level: 38 },
  { hour: "8PM", level: 35 },
  { hour: "9PM", level: 40 },
  { hour: "10PM", level: 0 },
  { hour: "11PM", level: 0 },
  { hour: "12AM", level: 0 },
]

const mockWeeklyData = [
  { day: "Mon", level: 52 },
  { day: "Tue", level: 48 },
  { day: "Wed", level: 55 },
  { day: "Thu", level: 50 },
  { day: "Fri", level: 58 },
  { day: "Sat", level: 45 },
  { day: "Sun", level: 42 },
]

const mockTimeData = [
  { range: "20-40dB", time: 2.5 },
  { range: "40-60dB", time: 6.2 },
  { range: "60-80dB", time: 1.8 },
  { range: "80-90dB", time: 0.3 },
  { range: "90-100dB", time: 0.1 },
  { range: "100+dB", time: 0.0 },
]

// OSHA color coding based on decibel levels
const getDecibelColor = (level: number) => {
  if (level === 0) return "text-gray-400"
  if (level < 50) return "text-green-500"
  if (level < 70) return "text-yellow-500"
  if (level < 85) return "text-orange-500"
  return "text-red-500"
}

const getTimeColor = (range: string, time: number) => {
  if (time === 0) return "text-gray-400"
  if (range.includes("20-40")) return "text-green-500"
  if (range.includes("40-60")) return "text-green-500"
  if (range.includes("60-80")) return "text-yellow-500"
  if (range.includes("80-90")) return "text-orange-500"
  return "text-red-500"
}

export default function SafeSoundPopup() {
  const [activeTab] = useState("Monitor")
  const [activeSubTab, setActiveSubTab] = useState<"Levels" | "Time">("Levels")
  const [viewMode, setViewMode] = useState<"Week" | "Day">("Day")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const handleDayClick = (day: string) => {
    if (viewMode === "Week") {
      setSelectedDay(day)
      setViewMode("Day")
    }
  }

  const handleBackClick = () => {
    setSelectedDay(null)
    setViewMode("Week")
  }

  return (
    <div className="w-[400px] h-[600px] bg-white flex flex-col">
      {/* Header */}
      <div className="text-center py-6 border-b">
        <h1 className="text-2xl font-bold text-gray-900">Safe Sound</h1>
        <p className="text-gray-500 text-sm">Audio Level Monitor</p>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{activeTab}</h2>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setActiveSubTab("Levels")}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
              activeSubTab === "Levels" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Levels
          </button>
          <button
            onClick={() => setActiveSubTab("Time")}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
              activeSubTab === "Time" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            Time
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === "Levels" && (
          <div className="p-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-4">
              {selectedDay && (
                <Button variant="ghost" size="sm" onClick={handleBackClick} className="p-1">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("Week")}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === "Week" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode("Day")}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === "Day" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Day
                </button>
              </div>
            </div>

            {/* Data Display */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {viewMode === "Week" ? "Weekly Audio Levels" : `Daily Audio Levels - ${selectedDay || "Today"}`}
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {viewMode === "Week"
                    ? mockWeeklyData.map((item) => (
                        <div
                          key={item.day}
                          className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                          onClick={() => handleDayClick(item.day)}
                        >
                          <span className="text-gray-600">{item.day}</span>
                          <span className={`font-medium ${getDecibelColor(item.level)}`}>{item.level}dB</span>
                        </div>
                      ))
                    : mockDailyData.map((item) => (
                        <div key={item.hour} className="flex justify-between items-center py-2">
                          <span className="text-gray-600">{item.hour}</span>
                          <span className={`font-medium ${getDecibelColor(item.level)}`}>{item.level}dB</span>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>

            {/* OSHA Guidelines */}
            {viewMode === "Week" && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">OSHA Guidelines:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Safe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">Caution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-600">Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Danger</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "Time" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Time by Decibel Range (Today)</h3>

                <div className="space-y-3">
                  {mockTimeData.map((item) => (
                    <div key={item.range} className="flex justify-between items-center py-2">
                      <span className="text-gray-600">{item.range}</span>
                      <span className={`font-medium ${getTimeColor(item.range, item.time)}`}>{item.time}h</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <strong>Today Total:</strong>
                  </div>
                  <div className="text-sm text-gray-500">
                    {mockTimeData.reduce((sum, item) => sum + item.time, 0).toFixed(1)} hours
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          This popup tracks audio levels and provides health-aware visualizations based on OSHA guidelines. Click
          between tabs to view level data and time distribution.
        </p>
      </div>
    </div>
  )
}
