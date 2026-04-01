import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, ChevronDown, ChevronRight, Power, ArrowUp, ArrowDown, Octagon } from 'lucide-react';
import { cn } from '../lib/utils';
import { g } from '../js/state/globals.js';
import { switchTug } from '../js/fleet/fleetManager.js';

export function WinchContent() {
  const [activeTug, setActiveTug] = useState('stern');
  const [brakeEngaged, setBrakeEngaged] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const [twinMode, setTwinMode] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (g) {
        if (g.activeTugId !== activeTug) setActiveTug(g.activeTugId);
        if (g.isTwinControl !== twinMode) setTwinMode(g.isTwinControl);
        if (g.ropeState) {
          if (g.ropeState.brakeEngaged !== brakeEngaged) setBrakeEngaged(g.ropeState.brakeEngaged);
          if ((g.ropeState.status === 2 || g.ropeState.status === 1) !== isConnected) {
            setIsConnected(g.ropeState.status === 2 || g.ropeState.status === 1);
          }
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activeTug, brakeEngaged, isConnected, twinMode]);

  const toggleTwinMode = () => {
    g.isTwinControl = !g.isTwinControl;
    setTwinMode(g.isTwinControl);
    const jsBE = document.getElementById('joystick-be');
    const sliderBE = document.getElementById('slider-be');
    if (g.isTwinControl) {
      if (jsBE) jsBE.classList.add('joystick-ghost');
      if (sliderBE) sliderBE.classList.add('joystick-ghost');
    } else {
      if (jsBE) jsBE.classList.remove('joystick-ghost');
      if (sliderBE) sliderBE.classList.remove('joystick-ghost');
      if (g.thrusters?.be) g.thrusters.be.thrust = 0;
      if (sliderBE) sliderBE.value = 0;
    }
  };

  const attemptDisconnect = () => {
    if (window.attemptDisconnect) window.attemptDisconnect();
  };

  const setWinchAction = (action) => {
    if (g && g.ropeState) {
      g.ropeState.winchAction = action;
      if (action !== 0 && !g.ropeState.brakeEngaged) g.ropeState.brakeEngaged = true;
    }
  };

  const toggleBrake = () => {
    if (g && g.ropeState) g.ropeState.brakeEngaged = !g.ropeState.brakeEngaged;
  };

  return (
    <div className="flex flex-col gap-3 min-w-[200px]">
      <button
        onClick={() => switchTug(activeTug === 'stern' ? 'bow' : 'stern')}
        className={cn(
          "w-full py-2 px-4 rounded-lg font-bold border-2 transition-colors",
          activeTug === 'stern' 
            ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30" 
            : "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30"
        )}
      >
        {activeTug === 'stern' ? 'REBOCADOR POPA' : 'REBOCADOR PROA'}
      </button>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400 uppercase">Twin Mode</span>
        <button 
          onClick={toggleTwinMode}
          className={cn(
            "px-3 py-1 border rounded text-xs font-semibold uppercase transition-colors",
            twinMode 
              ? "bg-slate-200 text-slate-900 border-white hover:bg-white" 
              : "bg-white/5 text-white border-white/10 hover:bg-white/10"
          )}
        >
          Twin
        </button>
      </div>

      {isConnected && (
        <button onClick={attemptDisconnect} className="flex items-center justify-center gap-2 w-full py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-600/30 rounded uppercase text-sm font-bold transition-colors">
          <Power size={14} /> Desconectar
        </button>
      )}

      <div className="flex justify-between gap-2 mt-1">
        <button
          onPointerDown={(e) => { e.preventDefault(); setWinchAction(1); }}
          onPointerUp={(e) => { e.preventDefault(); setWinchAction(0); }}
          onPointerLeave={() => setWinchAction(0)}
          className="flex flex-1 items-center justify-center gap-1 py-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 rounded font-bold text-sky-400 select-none touch-none"
        >
          <ArrowUp size={16} /> Heave
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); setWinchAction(-1); }}
          onPointerUp={(e) => { e.preventDefault(); setWinchAction(0); }}
          onPointerLeave={() => setWinchAction(0)}
          className="flex flex-1 items-center justify-center gap-1 py-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 rounded font-bold text-sky-400 select-none touch-none"
        >
          <ArrowDown size={16} /> Pay
        </button>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-slate-800 border border-red-500/50 text-red-400 font-bold rounded hover:bg-slate-700 transition-colors uppercase text-sm">
          Drop
        </button>
        <button onClick={toggleBrake} className={cn("flex-1 flex items-center justify-center gap-1 py-2 font-bold rounded border uppercase text-sm transition-colors", brakeEngaged ? "bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-slate-800 text-slate-400 border-slate-600")}>
           <Octagon size={14} /> {brakeEngaged ? 'Freio: ON' : 'Freio: OFF'}
        </button>
      </div>
    </div>
  );
}
