"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Pause, Play, RotateCcw, Flag, Square } from "lucide-react"

export type LapData = {
  id: string
  label: string
  duration: number
}

type StopwatchState = "idle" | "running" | "paused"

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`
}

type StopwatchProps = {
  onComplete: (totalDuration: number, laps: LapData[]) => void
}

export function Stopwatch({ onComplete }: StopwatchProps) {
  const [state, setState] = useState<StopwatchState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<LapData[]>([])
  const [lapStart, setLapStart] = useState(0)

  const startTimeRef = useRef(0)
  const elapsedBeforePauseRef = useRef(0)
  const animationRef = useRef<number>(0)

  const tick = useCallback(() => {
    const now = performance.now()
    setElapsed(elapsedBeforePauseRef.current + (now - startTimeRef.current))
    animationRef.current = requestAnimationFrame(tick)
  }, [])

  const handleStart = useCallback(() => {
    startTimeRef.current = performance.now()
    elapsedBeforePauseRef.current = 0
    setElapsed(0)
    setLaps([])
    setLapStart(0)
    setState("running")
    animationRef.current = requestAnimationFrame(tick)
  }, [tick])

  const handlePause = useCallback(() => {
    cancelAnimationFrame(animationRef.current)
    elapsedBeforePauseRef.current = elapsed
    setState("paused")
  }, [elapsed])

  const handleResume = useCallback(() => {
    startTimeRef.current = performance.now()
    setState("running")
    animationRef.current = requestAnimationFrame(tick)
  }, [tick])

  const handleLap = useCallback(() => {
    const lapDuration = elapsed - lapStart
    const newLap: LapData = {
      id: crypto.randomUUID(),
      label: `ラップ ${laps.length + 1}`,
      duration: Math.round(lapDuration),
    }
    setLaps((prev) => [...prev, newLap])
    setLapStart(elapsed)
  }, [elapsed, lapStart, laps.length])

  const handleStop = useCallback(() => {
    cancelAnimationFrame(animationRef.current)
    const finalElapsed = Math.round(elapsed)
    // 最後のラップを追加
    const lastLapDuration = finalElapsed - lapStart
    const finalLaps = [
      ...laps,
      {
        id: crypto.randomUUID(),
        label: `ラップ ${laps.length + 1}`,
        duration: Math.round(lastLapDuration),
      },
    ]
    setState("idle")
    onComplete(finalElapsed, finalLaps)
    setElapsed(0)
    setLaps([])
    setLapStart(0)
    elapsedBeforePauseRef.current = 0
  }, [elapsed, lapStart, laps, onComplete])

  const handleReset = useCallback(() => {
    cancelAnimationFrame(animationRef.current)
    setState("idle")
    setElapsed(0)
    setLaps([])
    setLapStart(0)
    elapsedBeforePauseRef.current = 0
  }, [])

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current)
  }, [])

  const currentLapElapsed = elapsed - lapStart

  return (
    <div className="flex flex-col items-center gap-6">
      {/* タイマー表示 */}
      <div className="text-center">
        <div className="font-mono text-5xl font-bold tracking-wider tabular-nums md:text-6xl">
          {formatTime(elapsed)}
        </div>
        {state === "running" && laps.length > 0 && (
          <div className="mt-2 font-mono text-lg text-muted-foreground tabular-nums">
            ラップ {laps.length + 1}: {formatTime(currentLapElapsed)}
          </div>
        )}
      </div>

      {/* 操作ボタン */}
      <div className="flex items-center gap-3">
        {state === "idle" && (
          <Button onClick={handleStart} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            開始
          </Button>
        )}
        {state === "running" && (
          <>
            <Button onClick={handleLap} variant="outline" size="lg" className="gap-2">
              <Flag className="h-5 w-5" />
              ラップ
            </Button>
            <Button onClick={handlePause} variant="secondary" size="lg" className="gap-2">
              <Pause className="h-5 w-5" />
              一時停止
            </Button>
            <Button onClick={handleStop} variant="destructive" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              停止
            </Button>
          </>
        )}
        {state === "paused" && (
          <>
            <Button onClick={handleResume} size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              再開
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg" className="gap-2">
              <RotateCcw className="h-5 w-5" />
              リセット
            </Button>
            <Button onClick={handleStop} variant="destructive" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              停止
            </Button>
          </>
        )}
      </div>

      {/* ラップ一覧（計測中） */}
      {laps.length > 0 && (
        <div className="w-full max-w-md">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">ラップ一覧</h3>
          <div className="divide-y rounded-md border">
            {[...laps].reverse().map((lap) => (
              <div key={lap.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground">{lap.label}</span>
                <span className="font-mono tabular-nums">{formatTime(lap.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
