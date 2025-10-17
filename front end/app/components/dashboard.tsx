"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, ChevronLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const BACKEND_URL = 'http://127.0.0.1:8000';

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
  if (decibelLevel < 85) return Number.POSITIVE_INFINITY
  if (decibelLevel < 90) return 8
  if (decibelLevel < 95) return 8
  if (decibelLevel < 100) return 4
  if (decibelLevel < 105) return 2
  if (decibelLevel < 110) return 1
  if (decibelLevel < 115) return 0.5
  return 0.25
}

// Color coding based on exposure vs OSHA limits
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

  // Data from backend
  const [dailyData, setDailyData] = useState<HourlyData[]>([])
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([])
  const [timeData, setTimeData] = useState<TimeData[]>([])
  const [weeklyTimeData, setWeeklyTimeData] = useState<TimeData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Audio monitoring
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentSPL, setCurrentSPL] = useState(0)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null)
  const [calibrationDbfs, setCalibrationDbfs] = useState<number | null>(null)

  // Fetch data from backend
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
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
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })

        // Create audio context
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyserNode = ctx.createAnalyser()
        analyserNode.fftSize = 2048
        analyserNode.smoothingTimeConstant = 0.8

        // Create microphone source
        const mic = ctx.createMediaStreamSource(stream)
        mic.connect(analyserNode)

        setAudioContext(ctx)
        setAnalyser(analyserNode)
        setMicrophone(mic)
        setIsPlaying(true)

        // Start measuring
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
        const measureDbfs = () => {
          analyserNode.getByteTimeDomainData(dataArray)
          const dbfs = getRMSdBFS(dataArray)
          setCalibrationDbfs(dbfs)

          if (isPlaying) {
            requestAnimationFrame(measureDbfs)
          }
        }
        measureDbfs()

      } catch (error) {
        console.error('Error accessing microphone:', error)
        alert('Could not access microphone. Please check permissions.')
      }
    } else {
      // Stop playing
      if (microphone) microphone.disconnect()
      if (audioContext) audioContext.close()
      setIsPlaying(false)
      setCalibrationDbfs(null)
    }
  }

  const handleCalibrationSave = async () => {
    if (!calibrationLevel || calibrationDbfs === null) {
      alert('Please play test audio and enter the measured decibel level')
      return
    }

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

      if (response.ok) {
        alert('Calibration saved successfully!')
        setCalibrationLevel('')
        setIsPlaying(false)
        if (microphone) microphone.disconnect()
        if (audioContext) audioContext.close()
        setCalibrationDbfs(null)

        // Start monitoring after calibration
        startMonitoring()
      } else {
        alert('Failed to save calibration')
      }
    } catch (error) {
      console.error('Error saving calibration:', error)
      alert('Error saving calibration')
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

      // Start analyzing and sending to backend
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
      let lastSendTime = Date.now()

      const analyze = async () => {
        if (!isMonitoring) return

        analyserNode.getByteTimeDomainData(dataArray)
        const dbfs = getRMSdBFS(dataArray)

        // Send to backend once per second
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

  // Auto-start monitoring if calibrated
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
}