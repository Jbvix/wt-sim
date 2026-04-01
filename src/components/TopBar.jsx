import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Anchor, Ship, Wind, Waves, Compass, Activity, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils.js';
import { g, shipState, envState } from '../js/state/globals.js';
import { WinchContent } from './WinchPanel.jsx'; // Extracted winch content

// ── Dropdown Reutilizável ──────────────────────────────────────────────
function DropdownMenu({ icon: Icon, label, title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fecha clicando fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all duration-300",
          "border backdrop-blur-md",
          isOpen 
            ? "bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)]" 
            : "bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800/80 hover:text-white"
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden md:inline">{label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-12 left-0 w-72 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 pointer-events-auto"
          >
            <div className="p-3 bg-white/5 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Icon className="w-3.5 h-3.5" />
               {title}
            </div>
            <div className="p-4 space-y-4 text-sm text-slate-300">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Componente Principal do Top Bar ──────────────────────────────────────────
export default function TopBar() {
  const [telemetry, setTelemetry] = useState({
    tension: 0,
    released: 0,
    currentMag: 0,
    currentDir: 0,
    tugSpeed: 0,
    shipSpeed: 0
  });

  // Polling Real-Time
  useEffect(() => {
    const interval = setInterval(() => {
      if (!g) return;
      
      let newTension = 0;
      let newReleased = 0;
      
      if (g.ropeState) {
        newTension = g.ropeState.tension;
        if (g.ropeState.status === 2 || g.ropeState.status === 1) {
          if (g.tugboat && g.ropeState.connectedBollard) {
             const tugPos = new THREE.Vector3();
             g.tugboat.getWorldPosition(tugPos);
             const bolPos = new THREE.Vector3();
             g.ropeState.connectedBollard.getWorldPosition(bolPos);
             
             const distance = Math.hypot(tugPos.x - bolPos.x, tugPos.z - bolPos.z);
             const slack = g.ropeState.lengthL0 - distance;
             newReleased = distance + Math.max(0, slack);
          }
        }
      }

      let newTugSpeed = 0;
      if (g.tugState?.velocity) {
        newTugSpeed = Math.hypot(g.tugState.velocity.x, g.tugState.velocity.y) * 1.94384;
      }

      let newShipSpeed = 0;
      if (shipState?.velocity) {
        newShipSpeed = Math.hypot(shipState.velocity.x, shipState.velocity.y) * 1.94384;
      }

      setTelemetry({
        tension: newTension,
        released: newReleased,
        currentMag: envState?.currentMag || 0,
        currentDir: envState?.currentDir || 0,
        tugSpeed: newTugSpeed,
        shipSpeed: newShipSpeed
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full p-4 flex flex-col md:flex-row items-start md:items-center justify-between pointer-events-none z-50 gap-4">
      
      {/* ── Esquerda: Cockpit Controls (Dropdowns) ── */}
      <div className="flex flex-wrap items-center gap-2 pointer-events-auto shrink-0 z-50">
        <DropdownMenu icon={Anchor} label="Guincho" title="Guincho & Rebocador">
          <WinchContent />
        </DropdownMenu>

        <DropdownMenu icon={Ship} label="Comando" title="Comando Panamax">
          <ShipCommandPanel />
        </DropdownMenu>
        
        <DropdownMenu icon={Wind} label="Atmosfera" title="Atmosfera & Mar">
          <EnvPanel />
        </DropdownMenu>
      </div>

      {/* ── Centro/Direita: Telemetria Unificada ── */}
      <div className="flex items-center gap-4 md:gap-6 px-4 md:px-6 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-lg pointer-events-auto shrink-0 justify-center">
        
        {/* Tensão */}
        <div className="flex flex-col items-center min-w-[70px] md:min-w-[80px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-base md:text-lg font-bold">
            <Activity className="w-4 h-4 opacity-50 hidden md:block" />
            {telemetry.tension.toFixed(1)} <span className="text-xs">t</span>
          </div>
          <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Tensão</span>
        </div>

        <div className="w-px h-6 md:h-8 bg-white/10"></div>

        {/* Vel Rebocador */}
        <div className="flex flex-col items-center min-w-[70px] md:min-w-[80px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-base md:text-lg font-bold">
            {telemetry.tugSpeed.toFixed(1)} <span className="text-xs">kn</span>
          </div>
          <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Vel RBCD</span>
        </div>

        <div className="w-px h-6 md:h-8 bg-white/10"></div>

        {/* Vel Navio */}
        <div className="flex flex-col items-center min-w-[70px] md:min-w-[80px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-base md:text-lg font-bold">
            {telemetry.shipSpeed.toFixed(1)} <span className="text-xs">kn</span>
          </div>
          <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Vel NAVIO</span>
        </div>

        {/* Separador */}
        <div className="w-px h-6 md:h-8 bg-white/10"></div>

        {/* Deriva Oceânica */}
        <div className="flex flex-col items-center min-w-[70px] md:min-w-[80px]">
          <div className="relative w-6 h-6 md:w-7 md:h-7 rounded-full border border-sky-500/30 flex items-center justify-center mt-1">
            <div 
              className="absolute w-[2px] h-3 md:h-4 bg-sky-400 origin-bottom left-1/2 -translate-x-1/2"
              style={{ bottom: '50%', transform: `rotate(${telemetry.currentDir}deg)` }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-sky-400"></div>
            </div>
          </div>
          <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold mt-1">Deriva</span>
        </div>

        <div className="w-px h-6 md:h-8 bg-white/10"></div>

        {/* Cabo Liberado */}
        <div className="flex flex-col items-center min-w-[70px] md:min-w-[80px]">
          <div className="flex items-center gap-1.5 text-sky-400 font-mono text-base md:text-lg font-bold">
             <Waves className="w-4 h-4 opacity-50 hidden md:block" />
             {telemetry.released.toFixed(1)} <span className="text-xs">m</span>
          </div>
          <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Liberado</span>
        </div>

      </div>
    </div>
  );
}

// ── Sub-Componentes (Extraídos do HTML Velho) ────────────────────

function ShipCommandPanel() {
  const [engine, setEngine] = useState(0);
  const [rudder, setRudder] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (g.ship?.command) {
        if (g.ship.command.engine !== engine) setEngine(g.ship.command.engine);
        if (g.ship.command.rudder !== rudder) setRudder(g.ship.command.rudder);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [engine, rudder]);

  const updateEngine = (val) => {
    const v = parseInt(val, 10);
    setEngine(v);
    if(g.ship?.command) g.ship.command.engine = v;
  };

  const updateRudder = (val) => {
    const v = parseInt(val, 10);
    setRudder(v);
    if(g.ship?.command) g.ship.command.rudder = v;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">Telegrafo de Máquinas</span>
          <span className={engine === 0 ? "text-slate-500" : engine > 0 ? "text-emerald-400" : "text-amber-400"}>
            {engine}%
          </span>
        </div>
        <input 
          type="range" min="-100" max="100" value={engine} 
          onChange={(e) => updateEngine(e.target.value)}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
        <button onClick={() => updateEngine(0)} className="w-full mt-2 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded text-xs font-bold transition-colors">
          PARAR MÁQUINA
        </button>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">Ângulo do Leme</span>
          <span className="text-sky-400">{rudder}°</span>
        </div>
        <input 
          type="range" min="-35" max="35" value={rudder} 
          onChange={(e) => updateRudder(e.target.value)}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
        <button onClick={() => updateRudder(0)} className="w-full mt-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded text-xs font-bold transition-colors">
          A MEIO (0°)
        </button>
      </div>
    </div>
  );
}

function EnvPanel() {
  const [env, setEnv] = useState({ wMag: 0, wDir: 0, cMag: 0, cDir: 0, fog: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      if (envState) {
        setEnv({
          wMag: envState.windMag || 0,
          wDir: envState.windDir || 0,
          cMag: envState.currentMag || 0,
          cDir: envState.currentDir || 0,
          fog: envState.fogDensity ? Math.round(envState.fogDensity * 500) : 0
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const update = (key, val) => {
    const v = parseFloat(val);
    setEnv(prev => ({ ...prev, [key]: v }));
    
    if (key === 'wMag' && envState) envState.windMag = v;
    if (key === 'wDir' && envState) envState.windDir = v;
    if (key === 'cMag' && envState) envState.currentMag = v;
    if (key === 'cDir' && envState) envState.currentDir = v;
    if (key === 'fog' && envState) {
        envState.fogDensity = v / 500;
        if(g.scene && g.scene.fog) g.scene.fog.density = envState.fogDensity;
    }
  };

  return (
    <div className="space-y-4">
      <SliderRow label="Vento (Nós)" val={env.wMag} max={60} onChange={v => update('wMag', v)} />
      <SliderRow label="Vento (Graus)" val={env.wDir} max={359} onChange={v => update('wDir', v)} suffix="°" />
      <SliderRow label="Corrente (Nós)" val={env.cMag} max={3} step={0.1} onChange={v => update('cMag', v)} />
      <SliderRow label="Corrente (Graus)" val={env.cDir} max={359} onChange={v => update('cDir', v)} suffix="°" />
      <SliderRow label="Nevoeiro (%)" val={env.fog} max={100} onChange={v => update('fog', v)} suffix="%" />
    </div>
  );
}

function SliderRow({ label, val, max, step=1, onChange, suffix="" }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-sky-400">{Number(val).toFixed(step < 1 ? 1 : 0)}{suffix}</span>
      </div>
      <input 
        type="range" min="0" max={max} step={step} value={val} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}
