/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
// import { useCrashContext } from "../Main/context";
import "./crash.scss";
import Unity from "react-unity-webgl";
import Context from "../../context";
import takeOffSound from "../../assets/audio/take_off.mp3";
import flewAwaySound from "../../assets/audio/flew_away.mp3";

let currentFlag = 0;

export default function WebGLStarter() {
  const { GameState, currentNum, time, myUnityContext, setCurrentTarget } =
    React.useContext(Context);
  const previousGameStateRef = React.useRef<string>("");
  const audioUnlockedRef = React.useRef<boolean>(false);
  const takeOffAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const flewAwayAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [target, setTarget] = React.useState(1);
  const [waiting, setWaiting] = React.useState(0);
  const [flag, setFlag] = React.useState(1);

  React.useEffect(() => {
    takeOffAudioRef.current = new Audio(takeOffSound);
    flewAwayAudioRef.current = new Audio(flewAwaySound);
    takeOffAudioRef.current.preload = "auto";
    flewAwayAudioRef.current.preload = "auto";
    takeOffAudioRef.current.volume = 0.5;
    flewAwayAudioRef.current.volume = 0.6;

    const unlockAudio = () => {
      audioUnlockedRef.current = true;
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      takeOffAudioRef.current?.pause();
      flewAwayAudioRef.current?.pause();
    };
  }, []);

  React.useEffect(() => {
    const prevState = previousGameStateRef.current;

    const playAudio = (audio: HTMLAudioElement | null) => {
      if (!audio || !audioUnlockedRef.current) {
        return;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore blocked autoplay errors and retry on next user interaction.
      });
    };

    if (GameState === "PLAYING" && prevState !== "PLAYING") {
      flewAwayAudioRef.current?.pause();
      playAudio(takeOffAudioRef.current);
    }

    if (GameState === "GAMEEND" && prevState !== "GAMEEND") {
      takeOffAudioRef.current?.pause();
      playAudio(flewAwayAudioRef.current);
    }

    previousGameStateRef.current = GameState;
  }, [GameState]);

  React.useEffect(() => {
    let myInterval: ReturnType<typeof setInterval> | undefined;
    if (GameState === "PLAYING") {
      setFlag(2);
      let startTime = Date.now() - time;
      let currentTime;
      let currentNum;
      const getCurrentTime = (e: number) => {
        currentTime = (Date.now() - startTime) / 1000;
        currentNum =
          1 +
          0.06 * currentTime +
          Math.pow(0.06 * currentTime, 2) -
          Math.pow(0.04 * currentTime, 3) +
          Math.pow(0.04 * currentTime, 4);
        if (currentNum > 2 && e === 2) {
          setFlag(3);
        } else if (currentNum > 10 && e === 3) {
          setFlag(4);
        }
        setTarget(currentNum);
        setCurrentTarget(currentNum);
      };
      myInterval = setInterval(() => {
        getCurrentTime(currentFlag);
      }, 20);
    } else if (GameState === "GAMEEND") {
      setFlag(5);
      setCurrentTarget(Number(currentNum));
      setTarget(Number(currentNum));
    } else if (GameState === "BET") {
      setFlag(1);
      let startWaiting = Date.now() - time;
      setTarget(1);
      setCurrentTarget(1);

      myInterval = setInterval(() => {
        setWaiting(Date.now() - startWaiting);
      }, 20);
    }
    return () => {
      if (myInterval) {
        clearInterval(myInterval);
      }
    };
  }, [GameState, time, setCurrentTarget]);

  React.useEffect(() => {
    myUnityContext?.send(
      "GameManager",
      "RequestToken",
      JSON.stringify({
        gameState: flag,
      }),
    );
    currentFlag = flag;
  }, [flag, myUnityContext]);

  const spaceRef = React.useRef<HTMLDivElement>(null);
  const planeRef = React.useRef<HTMLImageElement>(null);
  const [planeVisible, setPlaneVisible] = React.useState(false);
  const [showLoading, setShowLoading] = React.useState(false);
  const [showLogo, setShowLogo] = React.useState(true);

  // Create stars
  React.useEffect(() => {
    if (spaceRef.current) {
      // Clear existing stars
      const existingStars = spaceRef.current.querySelectorAll(".star");
      existingStars.forEach((star) => star.remove());

      // Create new stars
      for (let i = 0; i < 35; i++) {
        const star = document.createElement("div");
        star.classList.add("star");
        const size = Math.random() * 2 + 0.5;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.bottom = `-${size}px`;
        const delay = Math.random() * 7;
        const duration = Math.random() * 5 + 3.5;
        star.style.animation = `zoomOut ${duration}s linear ${delay}s infinite`;
        spaceRef.current.appendChild(star);
      }
    }
  }, []);

  // Handle game state changes
  React.useEffect(() => {
    if (GameState === "BET") {
      setShowLoading(true);
      setShowLogo(true);
      setPlaneVisible(false);
      if (planeRef.current) {
        planeRef.current.style.opacity = "0";
        planeRef.current.style.transform = "translate(0px, 0px) rotate(0deg)";
      }
    } else if (GameState === "PLAYING") {
      setShowLoading(false);
      setShowLogo(false);
      setPlaneVisible(true);
      if (planeRef.current) {
        planeRef.current.style.opacity = "1";
      }
    } else if (GameState === "GAMEEND") {
      setPlaneVisible(false);
    }
  }, [GameState]);

  // Update plane position during game
  React.useEffect(() => {
    if (GameState === "PLAYING" && planeRef.current && target > 1) {
      const maxX = 430;
      const maxY = 260;
      const progress = (target - 1.0) / (parseFloat(currentNum) - 1.0 || 1);
      const x = maxX * progress;
      const y = -maxY * progress;
      const rot = -25 * progress;
      planeRef.current.style.transition = "transform 0.1s linear";
      planeRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    }
  }, [target, GameState, currentNum]);

  return (
    <div className="crash-container">
      <div className="space-box" ref={spaceRef} id="space">
        <Unity
          unityContext={myUnityContext}
          matchWebGLToCanvasSize={true}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
        />
        <img
          src="https://i.ibb.co.com/sctqSHM/IMG-20251109-060111.png"
          alt="Plane"
          className={`plane ${planeVisible ? "visible" : ""}`}
          ref={planeRef}
        />
        <div className={`flew-away ${GameState === "GAMEEND" ? "show" : ""}`}>
          FLEW Away!
        </div>
        {GameState === "GAMEEND" && (
          <div className="crash-result-overlay">
            {Number(target).toFixed(2)}x
          </div>
        )}
        {GameState === "PLAYING" && (
          <div className={`multiplier show`}>
            {target - 0.01 >= 1 ? Number(target - 0.01).toFixed(2) : "1.00"}x
          </div>
        )}
        <div className={`center-logo ${showLogo ? "" : "hide"}`} id="ufcLogo">
          <img
            src="https://i.ibb.co.com/wZ5ZQgts/unnamed-2-removebg-preview.png"
            alt="UFC Aviator"
          />
        </div>
        <div
          className={`loading-container ${showLoading ? "show-loading" : ""}`}
        >
          <div className="loading-bar">
            <div
              className="loading-fill"
              id="fill"
              style={{
                width: showLoading
                  ? `${((5000 - waiting) * 100) / 5000}%`
                  : "0%",
                animation: showLoading
                  ? "loadingRightToLeft 5s linear forwards"
                  : "none",
              }}
            ></div>
          </div>
          <div className="loading-text">PREPARING NEXT ROUND...</div>
        </div>
      </div>
    </div>
  );
}
