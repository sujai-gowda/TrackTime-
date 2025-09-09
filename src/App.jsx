import React, { useState, useEffect, useRef } from "react";
import "./App.css";

export default function App() {
  const [timers, setTimers] = useState([]);
  const intervalsRef = useRef(new Map()); // store interval IDs here (id -> intervalId)

  // ask notification permission once
  useEffect(() => {
    if (Notification && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    // cleanup on unmount — clear any remaining intervals
    return () => {
      intervalsRef.current.forEach((iv) => clearInterval(iv));
      intervalsRef.current.clear();
    };
  }, []);

  const addTimer = () => {
    setTimers((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: "",
        hours: 0,
        minutes: 0,
        seconds: 0,
        time: 0, // total seconds
        isRunning: false,
      },
    ]);
  };

  // update name/hours/minutes/seconds in state (with clamping)
  const updateTimer = (id, field, rawValue) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (field === "name") return { ...t, name: String(rawValue) };
        let v = Number(rawValue);
        if (isNaN(v)) v = 0;
        if (field === "hours") {
          v = Math.max(0, Math.min(99, Math.floor(v)));
        } else {
          // minutes / seconds
          v = Math.max(0, Math.min(59, Math.floor(v)));
        }
        return { ...t, [field]: v };
      })
    );
  };

  // Set button: compute total seconds from HH:MM:SS inputs and set time, stop any running interval
  const setTimerFromInputs = (id) => {
    // clear existing interval if any
    const existing = intervalsRef.current.get(id);
    if (existing) {
      clearInterval(existing);
      intervalsRef.current.delete(id);
    }
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              time: t.hours * 3600 + t.minutes * 60 + t.seconds,
              isRunning: false,
            }
          : t
      )
    );
  };

  // Start timer — if already running do nothing. If time is zero and inputs present, use inputs.
  const startTimer = (id) => {
    // avoid multiple intervals for same timer
    if (intervalsRef.current.has(id)) return;

    const timer = timers.find((t) => t.id === id);
    if (!timer) return;

    // If time is zero but inputs are non-zero, initialize time from inputs
    let startTime = timer.time;
    if (startTime === 0) {
      const computed =
        (Number(timer.hours) || 0) * 3600 +
        (Number(timer.minutes) || 0) * 60 +
        (Number(timer.seconds) || 0);
      if (computed > 0) startTime = computed;
      else return; // nothing to start
    }

    // Mark running immediately
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, time: startTime, isRunning: true } : t
      )
    );

    // Create single interval and store its id in the ref map
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((t) => {
          if (t.id !== id) return t;
          if (t.time > 0) {
            return { ...t, time: t.time - 1 };
          } else {
            // time reached zero: clear interval and notify
            const iv = intervalsRef.current.get(id);
            if (iv) {
              clearInterval(iv);
              intervalsRef.current.delete(id);
            }
            if (Notification && Notification.permission === "granted") {
              new Notification(`⏰ "${t.name || "Untitled"}" finished!`);
            } else {
              // fallback
              // eslint-disable-next-line no-alert
              alert(`⏰ "${t.name || "Untitled"}" finished!`);
            }
            return { ...t, isRunning: false, time: 0 };
          }
        })
      );
    }, 1000);

    intervalsRef.current.set(id, intervalId);
  };

  // Pause timer: clear interval stored in ref map and mark isRunning false
  const pauseTimer = (id) => {
    const iv = intervalsRef.current.get(id);
    if (iv) {
      clearInterval(iv);
      intervalsRef.current.delete(id);
    }
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: false } : t))
    );
  };

  // Reset either single click (only time->0) or double click full reset
  const resetTimer = (id, fullReset = false) => {
    const iv = intervalsRef.current.get(id);
    if (iv) {
      clearInterval(iv);
      intervalsRef.current.delete(id);
    }
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? fullReset
            ? {
                ...t,
                time: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                isRunning: false,
              }
            : { ...t, time: 0, isRunning: false }
          : t
      )
    );
  };

  const deleteTimer = (id) => {
    const iv = intervalsRef.current.get(id);
    if (iv) {
      clearInterval(iv);
      intervalsRef.current.delete(id);
    }
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const formatTime = (time) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = time % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="app">
      <h1>TrackTime</h1>
      <div className="controls-row">
        <button className="add-btn" onClick={addTimer}>
          ➕ Add Timer
        </button>
      </div>

      <div className="timer-container">
        {timers.map((timer) => (
          <div key={timer.id} className="timer-card">
            <div className="card-top">
              <input
                className="timer-name"
                placeholder="Timer name"
                value={timer.name}
                onChange={(e) => updateTimer(timer.id, "name", e.target.value)}
              />
              <button
                className="delete-btn"
                title="Delete"
                onClick={() => deleteTimer(timer.id)}
              >
                ❌
              </button>
            </div>

            <div className="time-inputs">
              {["hours", "minutes", "seconds"].map((unit) => (
                <div key={unit} className="time-unit">
                  <button
                    className="arrow-btn"
                    onClick={() =>
                      updateTimer(
                        timer.id,
                        unit,
                        Math.min(99, (Number(timer[unit]) || 0) + 1)
                      )
                    }
                  >
                    ▲
                  </button>
                  <input
                    className="number-input"
                    type="number"
                    value={timer[unit]}
                    onChange={(e) =>
                      updateTimer(timer.id, unit, e.target.value)
                    }
                    min={0}
                    max={unit === "hours" ? 99 : 59}
                  />
                  <button
                    className="arrow-btn"
                    onClick={() =>
                      updateTimer(
                        timer.id,
                        unit,
                        Math.max(0, (Number(timer[unit]) || 0) - 1)
                      )
                    }
                  >
                    ▼
                  </button>
                  <div className="unit-label">{unit}</div>
                </div>
              ))}
            </div>

            <div
              className={`countdown ${
                timer.time > 0 && timer.time <= 10 ? "low-time" : ""
              }`}
            >
              {formatTime(timer.time)}
            </div>

            <div className="timer-buttons">
              <button
                className="start-btn"
                onClick={() => startTimer(timer.id)}
              >
                Start
              </button>
              <button
                className="pause-btn"
                onClick={() => pauseTimer(timer.id)}
              >
                Pause
              </button>
              <button
                className="reset-btn"
                onClick={() => resetTimer(timer.id)}
                onDoubleClick={() => resetTimer(timer.id, true)}
                title="Single click: set time to 0, Double click: full reset"
              >
                Reset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
