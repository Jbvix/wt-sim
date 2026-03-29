# WT-SIM — Simulador de Rebocagem Portuária

> Simulador 3D para navegadores marítimos de operações de rebocagem portuária com rebocadores azimutais, física catenária de cabos HMPE, interações avançadas de amarração dinâmica, e modelo Panamax de fluidos. **Alojado e em produção no Netlify.**

![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)
![ES Modules](https://img.shields.io/badge/ES6-Modulos-yellow?logo=javascript)
![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify)

---

## 🚢 Sobre o Projeto

O **WT-SIM** é um simulador realista escalável (Web-Native, sem servidores dedicados) construído para treino na área de manobras de navios mercantes de classe **Panamax** com dois rebocadores azimutais tracionadores (ASD).  
Anteriormente alojado em Monolith (`winchsim.html`), transitou para uma **Arquitetura ES6 Dinâmica** em `/src`, proporcionando uma separação em domínios lógicos (Estado, UI, Renderização Gráfica, e Física Integradora Euclidiana).

---

## ✨ Funcionalidades Avançadas

### 🛥️ Rebocadores Azimutais (ASD)
- **Operação de Dupla Frota** — Comando e alternância seamless dos rebocadores "Popa" (Vermelho) e "Proa" (Verde).
- **Controlos HMI Industriais** — Replica comandos ASD da vida real com "Dial direcional" e "Slider de RPM" separados.
- **Modo Twin Control** — Permite emparelhamento síncrono dos azimutes (thrusters) Bombordo/Estibordo.

### 🌊 Motor de Física Ambiental Rigorosa (`tugKinetics.js`)
Ao invés de interpolações lógicas falsas, esta build conta com Equações Cinemáticas de arrasto autênticas:
- **Deriva Aerodinâmica Quadrática ($F = \frac{1}{2}\rho V^2 A$)**: O impacto num Panamax exposto a 60 nós aplica uma carga tangível de >200T laterais e rotacionais.
- **Corrente Marítima & Arrasto Hidrodinâmico**: Carga contrafásica sob os 14m de draft do navio conforme velocidade submersa.
- **Binário Inercial Consistente (Torque Fixado)**: Física validada com momento polar que obedece a alavanca do rebocador face ao centro de carena ($T = R_x \cdot F_z - R_z \cdot F_x$).

### ⚓ Interatividade do Cabo (HMPE) e Amarração
- **Lançantes / Espringues Realistas**: O Panamax inicia atracações nos cabeços com offets de cruzamento reais (Spring lines).
- **Drag-and-Drop / Pontos de Passagem**: Clica num cabeço do cabo e reposiciona o mesmo nos cabeços do Cais dinâmicamente. O HMPE tensiona recalculando restrições automaticamente.
- **Guincho Mola-Amortecedor Operacional (`c & k` tunados)**: Tolerância à tração baseada no Freio, recolhimento (*Heave*), e soltura automática (*Pay-out*).

---

## 🚀 Como Usar e Rodar

Não necessita de `npm start` ou frameworks JS de SSR. Basta um servidor HTML estático ou Live Server.

### Pelo Site Ao Vivo
Aceda à ligação principal onde o **Deploy é feito pela Netlify** através deste Repositório!

### Instalação Local (Desenvolvimento)
```bash
# Clone o repositório
git clone https://github.com/Jbvix/wt-sim.git

# Corra um servidor local para que os imports ES6 operem nativamente:
npx serve .
# Ou na extensão Live Server (VSCode) com root no diretório inicial.
```
> O ponto de entrada principal é agora o **`index.html`** (o antigo `winchsim.html` já está deprecado nas iterações modulares).

---

## 📂 Arquitetura Modular

O código encontra-se fragmentado por domínios de negócio:
```
wt-sim/
├── index.html               # Shell de bootloader e UI HUD
├── src/
│   ├── js/
│   │   ├── main.js          # Controller Central (Init, Loop Animation)
│   │   ├── ui/              # Handlers de DOM e input gestual (hmi.js, controls.js)
│   │   ├── graphics/        # Three.JS Scene Builder (sceneSetup.js, models.js)
│   │   ├── physics/         # Colisões SAT (collision.js) e Fluidos/Integrador (tugKinetics.js)
│   │   ├── fleet/           # Configuração de Força Naval (tugData.js)
│   │   └── state/           # Fonte única de verdade (globals.js)
├── netlify.toml             # Target point Netlify (root point)
└── README.md
```

---

## 🎯 Controlos e HUD

| Ferramenta / Ícone         | Ação |
|-----------------------------|---|
| **Dial BB/BE**                | Rotacionar o azimute correspondente a cada Thruster (telemotor). |
| **Slider BB/BE**              | Ajustar Potência em RPM (1–100%). |
| **Duplo Clique c/ Rato**     | Zera a máquina automaticamente numa manobra crítica. |
| **Guincho de Rebocador**      | (Na view HUD), permite Heave e travagem pesada. |
| **Click num Cabeço Livre**   | Transporta a amarra na linha visível, travando a força elástica imediatamente caso o Navio exceda o limite inercial. |

---

## 👤 Autor

**Jossian Brito**  
*Oficial de Náutica e Arquiteto de Software Marítimo*  
[Perfil Github e Repositório](https://github.com/Jbvix)

---

## 📄 Licença

Uso Livre e Orientado ao Estudo de Simuladores Avançados (Licença MIT).
