"use client"

import { useState } from "react"
import { Calendar, Clock, ChevronLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Mock data for demonstration - now includes duration for each hour
const mockDailyData = [
  { hour: "12AM", level: 0, duration: 0 },
  { hour: "1AM", level: 0, duration: 0 },
  { hour: "2AM", level: 0, duration: 0 },
  { hour: "3AM", level: 0, duration: 0 },
  { hour: "4AM", level: 0, duration: 0 },
  { hour: "5AM", level: 0, duration: 0 },
  { hour: "6AM", level: 0, duration: 0 },
  { hour: "7AM", level: 45, duration: 0.8 },
  { hour: "8AM", level: 52, duration: 1.0 },
  { hour: "9AM", level: 48, duration: 0.5 },
  { hour: "10AM", level: 85, duration: 0.3 }, // Close to limit
  { hour: "11AM", level: 90, duration: 0.5 }, // Slightly over 8hr limit
  { hour: "12PM", level: 95, duration: 2.5 }, // Way over 4hr limit
  { hour: "1PM", level: 62, duration: 0.8 },
  { hour: "2PM", level: 100, duration: 2.8 }, // Way over 2hr limit
  { hour: "3PM", level: 53, duration: 0.6 },
  { hour: "4PM", level: 105, duration: 1.2 }, // Slightly over 1hr limit
  { hour: "5PM", level: 65, duration: 0.4 },
  { hour: "6PM", level: 110, duration: 0.6 }, // Slightly over 30min limit
  { hour: "7PM", level: 38, duration: 0.3 },
  { hour: "8PM", level: 35, duration: 0.2 },
  { hour: "9PM", level: 40, duration: 0.4 },
  { hour: "10PM", level: 0, duration: 0 },
  { hour: "11PM", level: 0, duration: 0 },
]

const mockWeeklyData = [
  { day: "Mon", level: 52, totalExposure: 8.2 },
  { day: "Tue", level: 48, totalExposure: 6.8 },
  { day: "Wed", level: 95, totalExposure: 5.2 }, // High level, moderate time
  { day: "Thu", level: 50, totalExposure: 7.1 },
  { day: "Fri", level: 88, totalExposure: 9.5 }, // Slightly over daily limit
  { day: "Sat", level: 45, totalExposure: 4.2 },
  { day: "Sun", level: 102, totalExposure: 3.8 }, // High level but within time limit
]

const mockTimeData = [
  { range: "20-40dB", time: 2.5, avgLevel: 35 },
  { range: "40-60dB", time: 6.2, avgLevel: 50 },
  { range: "60-80dB", time: 1.8, avgLevel: 70 },
  { range: "80-90dB", time: 0.8, avgLevel: 85 }, // Close to limit
  { range: "90-100dB", time: 3.1, avgLevel: 95 }, // Over 4hr limit for 95dB
  { range: "100+dB", time: 2.2, avgLevel: 105 }, // Way over 1hr limit for 105dB
]

const mockWeeklyTimeData = [
  { range: "20-40dB", time: 12.5, avgLevel: 35 },
  { range: "40-60dB", time: 28.4, avgLevel: 50 },
  { range: "60-80dB", time: 8.2, avgLevel: 70 },
  { range: "80-90dB", time: 3.8, avgLevel: 85 },
  { range: "90-100dB", time: 6.1, avgLevel: 95 }, // Over weekly limits
  { range: "100+dB", time: 4.2, avgLevel: 105 }, // Way over weekly limits
]

const mockDailyTimeByDay = {
  Mon: [
    { range: "20-40dB", time: 1.8, avgLevel: 35 },
    { range: "40-60dB", time: 4.2, avgLevel: 50 },
    { range: "60-80dB", time: 1.2, avgLevel: 70 },
    { range: "80-90dB", time: 0.5, avgLevel: 85 },
    { range: "90-100dB", time: 0.8, avgLevel: 95 },
    { range: "100+dB", time: 0.3, avgLevel: 105 },
  ],
  Tue: [
    { range: "20-40dB", time: 2.1, avgLevel: 35 },
    { range: "40-60dB", time: 3.8, avgLevel: 50 },
    { range: "60-80dB", time: 0.9, avgLevel: 70 },
    { range: "80-90dB", time: 0.4, avgLevel: 85 },
    { range: "90-100dB", time: 1.2, avgLevel: 95 },
    { range: "100+dB", time: 0.6, avgLevel: 105 },
  ],
  // Add more days as needed...
}

// Helper function to convert day abbreviations to full day names
const getFullDayName = (dayAbbr: string): string => {
  const dayMap: { [key: string]: string } = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  }
  return dayMap[dayAbbr] || dayAbbr
}

// OSHA exposure limits (in hours) based on decibel levels
const getOSHALimit = (decibelLevel: number): number => {
  if (decibelLevel < 85) return Number.POSITIVE_INFINITY // No limit for safe levels
  if (decibelLevel < 90) return 8 // 85-89 dB: 8 hours
  if (decibelLevel < 95) return 8 // 90-94 dB: 8 hours
  if (decibelLevel < 100) return 4 // 95-99 dB: 4 hours
  if (decibelLevel < 105) return 2 // 100-104 dB: 2 hours
  if (decibelLevel < 110) return 1 // 105-109 dB: 1 hour
  if (decibelLevel < 115) return 0.5 // 110-114 dB: 30 minutes
  return 0.25 // 115+ dB: 15 minutes
}

// Color coding based on exposure vs OSHA limits
const getExposureColor = (decibelLevel: number, exposureTime: number): string => {
  if (decibelLevel === 0 || exposureTime === 0) return "text-gray-400"

  const limit = getOSHALimit(decibelLevel)
  if (limit === Number.POSITIVE_INFINITY) return "text-green-500" // Always safe for low levels

  const overExposure = exposureTime - limit

  if (overExposure <= 0) return "text-green-500" // Within limits
  if (overExposure <= 1) return "text-yellow-500" // 0-1 hour over limit
  return "text-red-500" // More than 1 hour over limit
}

// Bar color for visual representation
const getExposureBarColor = (decibelLevel: number, exposureTime: number): string => {
  if (decibelLevel === 0 || exposureTime === 0) return "bg-gray-300"

  const limit = getOSHALimit(decibelLevel)
  if (limit === Number.POSITIVE_INFINITY) return "bg-green-500" // Always safe for low levels

  const overExposure = exposureTime - limit

  if (overExposure <= 0) return "bg-green-500" // Within limits
  if (overExposure <= 1) return "bg-yellow-500" // 0-1 hour over limit
  return "bg-red-500" // More than 1 hour over limit
}

// Calculate daily total exposure risk
const getDailyExposureColor = (totalExposure: number, avgLevel: number): string => {
  if (totalExposure === 0) return "text-gray-400"

  // Get OSHA limit for this decibel level
  const dailyLimit = getOSHALimit(avgLevel)
  if (dailyLimit === Number.POSITIVE_INFINITY) return "text-green-500"

  // Calculate how much over the limit we are
  const overExposure = totalExposure - dailyLimit

  // High risk: high decibel level (85+) with long exposure time
  if (avgLevel >= 85 && totalExposure > 6) return "text-red-500"

  // Medium-high risk: over OSHA limits
  if (overExposure > 1) return "text-red-500"

  // Medium risk: slightly over limits or moderate exposure to high levels
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "text-yellow-500"

  // Low risk: within safe limits
  return "text-green-500"
}

const getDailyExposureBarColor = (totalExposure: number, avgLevel: number): string => {
  if (totalExposure === 0) return "bg-gray-300"

  // Get OSHA limit for this decibel level
  const dailyLimit = getOSHALimit(avgLevel)
  if (dailyLimit === Number.POSITIVE_INFINITY) return "bg-green-500"

  // Calculate how much over the limit we are
  const overExposure = totalExposure - dailyLimit

  // High risk: high decibel level (85+) with long exposure time
  if (avgLevel >= 85 && totalExposure > 6) return "bg-red-500"

  // Medium-high risk: over OSHA limits
  if (overExposure > 1) return "bg-red-500"

  // Medium risk: slightly over limits or moderate exposure to high levels
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "bg-yellow-500"

  // Low risk: within safe limits
  return "bg-green-500"
}

export default function SafeSoundDashboard() {
  const [activeTab, setActiveTab] = useState<"Monitor" | "Calibration">("Monitor")
  const [activeSubTab, setActiveSubTab] = useState<"Levels" | "Time">("Levels")
  const [viewMode, setViewMode] = useState<"Week" | "Day">("Day")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calibrationLevel, setCalibrationLevel] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)

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

  const handlePlayAudio = () => {
    setIsPlaying(!isPlaying)
    // In a real implementation, this would play/stop test audio
  }

  const handleCalibrationSave = () => {
    // In a real implementation, this would save the calibration value
    console.log("Calibration saved:", calibrationLevel)
  }

  return (
    <div className="w-[400px] h-[600px] bg-white flex flex-col">
      {/* Header */}
      <div className="text-center py-6 border-b">
        <h1 className="text-2xl font-bold text-gray-900">Safe Sound</h1>
        <p className="text-gray-500 text-sm">Desktop Audio Monitor</p>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("Monitor")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                activeTab === "Monitor" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monitor
            </button>
            <button
              onClick={() => setActiveTab("Calibration")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                activeTab === "Calibration" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Settings className="w-3 h-3" />
              Calibration
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "Monitor" ? (
          <div className="p-4">
            {/* Combined Toggle Controls */}
            <div className="flex items-center gap-2 mb-4">
              {/* Levels/Time Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveSubTab("Levels")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    activeSubTab === "Levels" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Levels
                </button>
                <button
                  onClick={() => setActiveSubTab("Time")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    activeSubTab === "Time" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Time
                </button>
              </div>
            </div>

            {/* Data Display */}
            {activeSubTab === "Levels" && (
              <Card>
                <CardContent className="p-4">
                  {/* Week/Day Toggle - moved inside card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {selectedDay && (
                        <Button variant="ghost" size="sm" onClick={handleBackClick} className="p-1 mr-2">
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode("Week")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          viewMode === "Week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setViewMode("Day")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          viewMode === "Day" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Day
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {viewMode === "Week"
                      ? "Weekly Audio Levels"
                      : `Daily Audio Levels - ${selectedDay ? getFullDayName(selectedDay) : "Today"}`}
                  </h3>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {viewMode === "Week"
                      ? mockWeeklyData.map((item) => (
                          <div
                            key={item.day}
                            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                            onClick={() => handleDayClick(item.day)}
                          >
                            <span className="text-gray-600 w-12 text-sm">{item.day}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${getDailyExposureBarColor(item.totalExposure, item.level)}`}
                                  style={{
                                    width: `${Math.max(Math.min((item.totalExposure / 16) * 100, 100), item.totalExposure === 0 ? 0 : 2)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`font-medium text-sm w-12 ${getDailyExposureColor(item.totalExposure, item.level)}`}
                              >
                                {item.level}dB
                              </span>
                            </div>
                          </div>
                        ))
                      : mockDailyData.map((item) => (
                          <div key={item.hour} className="flex items-center gap-3 py-2">
                            <span className="text-gray-600 w-12 text-sm">{item.hour}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${getExposureBarColor(item.level, item.duration)}`}
                                  style={{
                                    width: `${Math.max((item.duration / 1) * 100, item.duration === 0 ? 0 : 2)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`font-medium text-sm w-12 ${getExposureColor(item.level, item.duration)}`}
                              >
                                {item.level}dB
                              </span>
                            </div>
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSubTab === "Time" && (
              <Card>
                <CardContent className="p-4">
                  {/* Week/Day Toggle - moved inside card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {selectedDay && (
                        <Button variant="ghost" size="sm" onClick={handleBackClick} className="p-1 mr-2">
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode("Week")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          viewMode === "Week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setViewMode("Day")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          viewMode === "Day" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Day
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {viewMode === "Week"
                      ? "Weekly Time by Decibel Range"
                      : `Daily Time by Decibel Range - ${selectedDay ? getFullDayName(selectedDay) : "Today"}`}
                  </h3>

                  <div className="space-y-3">
                    {(viewMode === "Week"
                      ? mockWeeklyTimeData
                      : selectedDay && mockDailyTimeByDay[selectedDay]
                        ? mockDailyTimeByDay[selectedDay]
                        : mockTimeData
                    ).map((item) => {
                      const currentData =
                        viewMode === "Week"
                          ? mockWeeklyTimeData
                          : selectedDay && mockDailyTimeByDay[selectedDay]
                            ? mockDailyTimeByDay[selectedDay]
                            : mockTimeData
                      const maxTime = Math.max(...currentData.map((d) => d.time))
                      return (
                        <div key={item.range} className="flex items-center gap-3 py-2">
                          <span className="text-gray-600 w-20 text-sm">{item.range}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${getExposureBarColor(item.avgLevel, item.time)}`}
                                style={{
                                  width: `${Math.max((item.time / maxTime) * 100, item.time === 0 ? 0 : 2)}%`,
                                }}
                              />
                            </div>
                            <span className={`font-medium text-sm w-12 ${getExposureColor(item.avgLevel, item.time)}`}>
                              {item.time}h
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <strong>{viewMode === "Week" ? "Weekly" : "Today"} Total:</strong>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(viewMode === "Week"
                        ? mockWeeklyTimeData
                        : selectedDay && mockDailyTimeByDay[selectedDay]
                          ? mockDailyTimeByDay[selectedDay]
                          : mockTimeData
                      )
                        .reduce((sum, item) => sum + item.time, 0)
                        .toFixed(1)}{" "}
                      hours
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OSHA Guidelines */}
            {viewMode === "Week" && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {activeSubTab === "Levels" ? "OSHA Guidelines:" : "Weekly Exposure Limits:"}
                </h4>
                {activeSubTab === "Levels" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Within Limits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-gray-600">Slightly Over</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-600">Dangerous</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>• 85-89dB: 8hr limit • 95-99dB: 4hr limit</p>
                      <p>• 100-104dB: 2hr limit • 105-109dB: 1hr limit</p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-1 text-xs text-gray-500">
                    <p>• 85-89dB: 40hr/week • 95-99dB: 20hr/week</p>
                    <p>• 100-104dB: 10hr/week • 105-109dB: 5hr/week</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Calibrate Audio Levels</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    To accurately measure audio levels, we need to calibrate your system. Follow these steps:
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-gray-900 text-sm">Setup Instructions:</h4>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li>Open a decibel meter app on your mobile phone</li>
                    <li>Place your phone at your usual listening position</li>
                    <li>Click "Play Test Audio" below</li>
                    <li>Enter the decibel reading from your phone</li>
                    <li>Click "Save Calibration" to complete setup</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <Button
                      onClick={handlePlayAudio}
                      className={`w-full ${isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                    >
                      {isPlaying ? "Stop Test Audio" : "Play Test Audio"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="calibration-level" className="text-sm font-medium text-gray-700">
                      Measured Decibel Level
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="calibration-level"
                        type="number"
                        placeholder="e.g., 75"
                        value={calibrationLevel}
                        onChange={(e) => setCalibrationLevel(e.target.value)}
                        className="flex-1"
                      />
                      <span className="flex items-center text-sm text-gray-600">dB</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCalibrationSave}
                    disabled={!calibrationLevel}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300"
                  >
                    Save Calibration
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    <strong>Recommended Apps:</strong> Sound Meter (iOS), Decibel X (iOS), Sound Meter (Android), or any
                    calibrated decibel meter app.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">OSHA-Compliant Audio Monitoring</p>
          <div className="flex justify-center items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Safe</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Caution</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Danger</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
