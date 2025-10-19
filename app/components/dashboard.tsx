"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, ChevronLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const BACKEND_URL = 'http://127.0.0.1:8000';

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

const getOSHALimit = (decibelLevel: number): number => {
  if (decibelLevel < 85) return Number.POSITIVE_INFINITY
  if (decibelLevel < 90) return 8
  if (decibelLevel < 95) return 8
  if (decibelLevel < 100) return 4
  if (decibelLevel < 105) return 2
  if (decibelLevel < 110) return 1
  if (decibelLevel < 115) return 0.5
  return 0.25
}

const getExposureColor = (decibelLevel: number, exposureTime: number): string => {
  if (decibelLevel === 0 || exposureTime === 0) return "text-gray-400"

  const limit = getOSHALimit(decibelLevel)
  if (limit === Number.POSITIVE_INFINITY) return "text-green-500"

  const overExposure = exposureTime - limit

  if (overExposure <= 0) return "text-green-500"
  if (overExposure <= 1) return "text-yellow-500"
  return "text-red-500"
}

const getExposureBarColor = (decibelLevel: number, exposureTime: number): string => {
  if (decibelLevel === 0 || exposureTime === 0) return "bg-gray-300"

  const limit = getOSHALimit(decibelLevel)
  if (limit === Number.POSITIVE_INFINITY) return "bg-green-500"

  const overExposure = exposureTime - limit

  if (overExposure <= 0) return "bg-green-500"
  if (overExposure <= 1) return "bg-yellow-500"
  return "bg-red-500"
}

const getDailyExposureColor = (totalExposure: number, avgLevel: number): string => {
  if (totalExposure === 0) return "text-gray-400"

  const dailyLimit = getOSHALimit(avgLevel)
  if (dailyLimit === Number.POSITIVE_INFINITY) return "text-green-500"

  const overExposure = totalExposure - dailyLimit

  if (avgLevel >= 85 && totalExposure > 6) return "text-red-500"
  if (overExposure > 1) return "text-red-500"
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "text-yellow-500"

  return "text-green-500"
}

const getDailyExposureBarColor = (totalExposure: number, avgLevel: number): string => {
  if (totalExposure === 0) return "bg-gray-300"

  const dailyLimit = getOSHALimit(avgLevel)
  if (dailyLimit === Number.POSITIVE_INFINITY) return "bg-green-500"

  const overExposure = totalExposure - dailyLimit

  if (avgLevel >= 85 && totalExposure > 6) return "bg-red-500"
  if (overExposure > 1) return "bg-red-500"
  if (overExposure > 0 || (avgLevel >= 70 && totalExposure > 4)) return "bg-yellow-500"

  return "bg-green-500"
}

interface HourlyData {
  hour: string
  level: number
  duration: number
}

interface DailyData {
  day: string
  level: number
  totalExposure: number
  date: string
}

interface TimeData {
  range: string
  time: number
  avgLevel: number
}

export default function SafeSoundDashboard() {
  const [activeTab, setActiveTab] = useState<"Monitor" | "Calibration">("Monitor")
  const [activeSubTab, setActiveSubTab] = useState<"Levels" | "Time">("Levels")
  const [viewMode, setViewMode] = useState<"Week" | "Day">("Day")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calibrationLevel, setCalibrationLevel] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)

  const [dailyData, setDailyData] = useState<HourlyData[]>([])
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([])
  const [timeData, setTimeData] = useState<TimeData[]>([])
  const [weeklyTimeData, setWeeklyTimeData] = useState<TimeData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentSPL, setCurrentSPL] = useState(0)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null)
  const [calibrationDbfs, setCalibrationDbfs] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [viewMode, selectedDay])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch daily data
      const dailyResponse = await fetch(`${BACKEND_URL}/api/daily-data${selectedDay ? `?date=${selectedDay}` : ''}`)
      const dailyJson = await dailyResponse.json()
      setDailyData(dailyJson)

      // Fetch weekly data
      const weeklyResponse = await fetch(`${BACKEND_URL}/api/weekly-data`)
      const weeklyJson = await weeklyResponse.json()
      setWeeklyData(weeklyJson)

      // Fetch time by range
      const timeResponse = await fetch(`${BACKEND_URL}/api/time-by-range?period=day${selectedDay ? `&date=${selectedDay}` : ''}`)
      const timeJson = await timeResponse.json()
      setTimeData(timeJson)

      // Fetch weekly time data
      const weeklyTimeResponse = await fetch(`${BACKEND_URL}/api/time-by-range?period=week`)
      const weeklyTimeJson = await weeklyTimeResponse.json()
      setWeeklyTimeData(weeklyTimeJson)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDayClick = (day: string, date: string) => {
    if (viewMode === "Week") {
      setSelectedDay(date)
      setViewMode("Day")
    }
  }

  const handleBackClick = () => {
    setSelectedDay(null)
    setViewMode("Week")
  }

  const getRMSdBFS = (dataArray: Uint8Array): number => {
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    const dbfs = 20 * Math.log10(rms)
    return dbfs
  }

  const handlePlayAudio = async () => {
    if (!isPlaying) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyserNode = ctx.createAnalyser()
        analyserNode.fftSize = 2048
        analyserNode.smoothingTimeConstant = 0.8

        const mic = ctx.createMediaStreamSource(stream)
        mic.connect(analyserNode)

        setAudioContext(ctx)
        setAnalyser(analyserNode)
        setMicrophone(mic)
        setIsPlaying(true)

        const dataArray = new Uint8Array(analyserNode.frequencyBinCount)

        const measureDbfs = () => {
          if (!analyserNode) return

          analyserNode.getByteTimeDomainData(dataArray)
          const dbfs = getRMSdBFS(dataArray)
          setCalibrationDbfs(dbfs)

          if (ctx.state === 'running') {
            requestAnimationFrame(measureDbfs)
          }
        }
        measureDbfs()

      } catch (error) {
        console.error('Error accessing microphone:', error)
        alert('Could not access microphone. Please check permissions.')
      }
    } else {
      if (microphone) microphone.disconnect()
      if (audioContext) audioContext.close()
      setIsPlaying(false)
      setCalibrationDbfs(null)
    }
  }

  const handleCalibrationSave = async () => {
    if (!calibrationLevel || calibrationDbfs === null || isNaN(calibrationDbfs)) {
      alert('Please play test audio and enter the measured decibel level')
      return
    }

    console.log('Sending calibration:', {
      spl_reading: parseFloat(calibrationLevel),
      dbfs_reading: calibrationDbfs
    })

    try {
      const response = await fetch(`${BACKEND_URL}/api/calibration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spl_reading: parseFloat(calibrationLevel),
          dbfs_reading: calibrationDbfs,
        }),
      })

      const data = await response.json()
      console.log('Calibration response:', data)

      if (response.ok) {
        alert('Calibration saved successfully!')
        setCalibrationLevel('')
        setIsPlaying(false)
        if (microphone) microphone.disconnect()
        if (audioContext) audioContext.close()
        setCalibrationDbfs(null)
        startMonitoring()
      } else {
        console.error('Calibration failed:', data)
        alert(`Failed to save calibration: ${data.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving calibration:', error)
      alert('Error saving calibration: ' + error)
    }
  }

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 2048
      analyserNode.smoothingTimeConstant = 0.8

      const mic = ctx.createMediaStreamSource(stream)
      mic.connect(analyserNode)

      setAudioContext(ctx)
      setAnalyser(analyserNode)
      setMicrophone(mic)
      setIsMonitoring(true)

      const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
      let lastSendTime = Date.now()

      const analyze = async (): Promise<void> => {
        if (!isMonitoring) return

        analyserNode.getByteTimeDomainData(dataArray)
        const dbfs = getRMSdBFS(dataArray)

        const now = Date.now()
        if (now - lastSendTime >= 1000) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/audio-reading`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                dbfs: dbfs,
                timestamp: new Date().toISOString(),
              }),
            })

            if (response.ok) {
              const data = await response.json()
              setCurrentSPL(Math.round(data.spl))
            }
          } catch (error) {
            console.error('Error sending audio data:', error)
          }
          lastSendTime = now
        }

        requestAnimationFrame(analyze)
      }
      analyze()

    } catch (error) {
      console.error('Error starting monitoring:', error)
    }
  }

  useEffect(() => {
    const checkCalibration = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/calibration`)
        const data = await response.json()
        if (data.offset && data.offset !== 0 && !isMonitoring) {
          startMonitoring()
        }
      } catch (error) {
        console.error('Error checking calibration:', error)
      }
    }
    checkCalibration()
  }, [])

  return (
    <div className="w-[400px] h-[600px] bg-white flex flex-col">
      <div className="text-center py-6 border-b">
        <h1 className="text-2xl font-bold text-gray-900">Safe Sound</h1>
        <p className="text-gray-500 text-sm">Desktop Audio Monitor</p>
        {isMonitoring && (
          <p className="text-green-600 text-xs mt-1">● Monitoring: {currentSPL} dB SPL</p>
        )}
      </div>

      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("Monitor")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${activeTab === "Monitor" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Monitor
            </button>
            <button
              onClick={() => setActiveTab("Calibration")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${activeTab === "Calibration" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Settings className="w-3 h-3" />
              Calibration
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "Monitor" ? (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveSubTab("Levels")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${activeSubTab === "Levels" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <Calendar className="w-3 h-3" />
                  Levels
                </button>
                <button
                  onClick={() => setActiveSubTab("Time")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${activeSubTab === "Time" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <Clock className="w-3 h-3" />
                  Time
                </button>
              </div>
            </div>

            {activeSubTab === "Levels" && (
              <Card>
                <CardContent className="p-4">
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
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === "Week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setViewMode("Day")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === "Day" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        Day
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {viewMode === "Week"
                      ? "Weekly Audio Levels"
                      : `Daily Audio Levels - ${selectedDay ? new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long' }) : "Today"}`}
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {viewMode === "Week"
                        ? weeklyData.map((item) => (
                          <div
                            key={item.day}
                            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                            onClick={() => handleDayClick(item.day, item.date)}
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
                        : dailyData.map((item) => (
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
                  )}
                </CardContent>
              </Card>
            )}

            {activeSubTab === "Time" && (
              <Card>
                <CardContent className="p-4">
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
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === "Week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setViewMode("Day")}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === "Day" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        Day
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {viewMode === "Week"
                      ? "Weekly Time by Decibel Range"
                      : `Daily Time by Decibel Range - ${selectedDay ? new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long' }) : "Today"}`}
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {(viewMode === "Week" ? weeklyTimeData : timeData).map((item) => {
                          const currentData = viewMode === "Week" ? weeklyTimeData : timeData
                          const maxTime = Math.max(...currentData.map((d) => d.time), 1)
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
                          {(viewMode === "Week" ? weeklyTimeData : timeData)
                            .reduce((sum, item) => sum + item.time, 0)
                            .toFixed(1)}{" "}
                          hours
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

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

                {calibrationDbfs !== null && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      Current microphone reading: <strong>{calibrationDbfs.toFixed(1)} dBFS</strong>
                    </p>
                  </div>
                )}

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
                      Measured Decibel Level (from phone)
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
                    disabled={!calibrationLevel || calibrationDbfs === null}
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