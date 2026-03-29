# WT-SIM — Simulador de Rebocagem Portuária

> Simulador 3D de operações de rebocagem com rebocadores azimutais, física de cabos HMPE, modelo Panamax dinâmico e HMI Twin Joystick — desenvolvido inteiramente em Three.js, sem dependências de servidor.

![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)
![HTML5](https://img.shields.io/badge/HTML5-Single%20File-orange?logo=html5)
![Licença](https://img.shields.io/badge/Licença-MIT-green)

---

## 🚢 Sobre o Projeto

O **WT-SIM** é um simulador realístico de operações de rebocagem portuária destinado a treino e estudo de manobras. O utilizador opera dois rebocadores azimutais (Popa e Proa) para manobrar um navio mercante tipo **Panamax** atracado num cais, usando cabos HMPE dinâmicos com física de mola amortecida.

---

## ✨ Funcionalidades

### 🛥️ Rebocadores Azimutais (ASD)
- **Frota de 2 rebocadores** — Popa (vermelho) e Proa (verde)
- **HMI Twin Joystick** — Dial direcional + Slider de RPM por thruster (BB/BE)
- **Twin Mode** — Sincronização dos dois azimutes
- **Física vetorial completa** — Thrust, arrasto, inércia, corrente oceânica
- **Colisões físicas** — Rebocador vs. Cais e Rebocador vs. Panamax (SAT)

### ⚓ Sistema de Cabos (HMPE)
- Cabo dinâmico com **curva Bézier quadrática** (catenary visual)
- Física de **mola-amortecedor** (k=200, damping=400)
- Guincho com **Caçar (Heave)** e **Arriar (Pay-out)**
- Freio de guincho com **interlock de segurança** (tensão > 1 t)
- **Telemetria em tempo real** — Tensão (t) e Comprimento liberado (m)

### 🚢 Navio Mercante Panamax
- Modelo 3D com casco (225×32×14 m), superestrutura e luzes de navegação
- **8 cabeços de amarração** — 4 por bordo (Bombordo/Cais e Boreste/Mar)
- Cabeços de reboque na Proa e Popa
- **4 espias de amarração ao cais** com física própria (lançantes + espringues)
- Motor e Leme pilotável (Telegrafo e Rudder)
- **Colisões físicas** com cais e rebocadores

### 🌊 Ambiente e Atmosfera
- **Vento** — Magnitude (0–60 kn) e Direção (0–359°) com biruta 3D animada
- **Corrente Oceânica** — Magnitude e Direção com bússola HUD
- **Nevoeiro** — Densidade variável (0–100%) com FogExp2
- **Luzes de Navegação** — Posição, mastro, popa (rebocadores e Panamax)

### 🎮 Interface (HUD)
- **Painéis colapsáveis** — Atmosfera & Mar, Comando Panamax
- **Zoom rápido** — Botões + / −
- **Controlo de câmara** — OrbitControls (mouse/touch)
- **Aviso de portrait** — Bloqueio automático em mobile vertical

---

## 🚀 Como Usar

Não requer instalação, servidor ou build. Funciona diretamente no browser.

```bash
# Clone o repositório
git clone https://github.com/Jbvix/wt-sim.git

# Abra o ficheiro no browser
start wt-sim/winchsim.html
```

> **Recomendado:** Google Chrome ou Microsoft Edge (suporte completo a WebGL e `writing-mode` em sliders).

---

## 🎯 Controlos

| Controlo | Ação |
|---|---|
| **Dial BB/BE** | Rotacionar azimute do thruster |
| **Slider BB/BE** | Potência do thruster (0–100%) |
| **Duplo clique no dial** | Zera a potência (para máquina) |
| **Clique no guincho** | Seleciona cabo na mão |
| **Clique no cabeço** | Liga / Solta cabo |
| **Botão Frota** | Alterna entre rebocador Popa e Proa |
| **Twin Mode** | Sincroniza BB e BE |
| **Scroll / + −** | Zoom da câmara |
| **Drag** | Rodar câmara |

---

## 🏗️ Tecnologias

| Tecnologia | Uso |
|---|---|
| [Three.js r160](https://threejs.org/) | Renderização 3D WebGL |
| OrbitControls | Controlo de câmara interativo |
| HTML5 / CSS3 / ES Modules | Interface e estrutura (single-file) |
| Physics Engine (custom) | Integração Euler, SAT collision, spring-damper |

---

## 📁 Estrutura

```
wt-sim/
├── winchsim.html      # Aplicação completa (single-file)
├── test_responsive.html  # Teste de layout responsivo
├── lint.mjs / lint2.mjs  # Scripts de lint local
└── README.md
```

---

## 👤 Autor

**Jossian Brito**  
Oficial de Náutica | Desenvolvimento de Simuladores Marítimos  
[GitHub @Jbvix](https://github.com/Jbvix)

---

## 📄 Licença

MIT — livre para uso educacional e profissional.
