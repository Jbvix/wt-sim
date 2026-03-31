# Sumário de Desenvolvimento & Lições Aprendidas
**Data:** 30 de Março de 2026  
**Projeto:** WT-SIM (Simulador Interativo de Reboque Portuário)  
**Objetivo do Dia:** Estabilização Orgânica do Sistema Físico e Cinemática Avançada.

---

## 🛠️ Correções e Bugs Resolvidos

1. **Bug da "Tela Preta" (GLB Pathing):**
   - **Problema:** O Netlify crachava sem logs ao iniciar o simulador em produção.
   - **Correção:** Resolvido o *Case Sensitivity* nas pastas dos modelos mecânicos e adicionada injeção de erros flutuante no `index.html` para diagnóstico móvel rápido.

2. **Inversão da Matriz Vetorial do Rebocador:**
   - **Problema:** Puxar a popa do Navio, ou transladar de proa, resultava matematicamente no mesmo comportamento (Torque Fantasma).
   - **Correção:** Substituição dos sinais trigonométricos da translação Local $\to$ Global no `tugKinetics.js`: `(tugForceX * cosH - tugForceZ * sinH)`, corrigindo as trajetórias marítimas independentes de cada motor Schottel face ao oceano.

3. **Anomalia do Thrust Infinito ("O Rebocador que Foge"):**
   - **Problema:** A Tensão HMPE estava limitada a `200 Ton-Força` reais, mas o azimutal injetava uma propulsão absurda de `60,000 Ton-Força` no arrasto, ignorando completamente as linhas de retenção.
   - **Correção:** Redução do multiplicativo temporal (`THRUST_MULTIPLIER` de $600$ para $0.8$), criando um Bollard Pull realista de ~160T combinadas, perfeitamente em paridade tática com as 200T da corda, forçando as colisões rígidas.

4. **Inércia do "Navio Mergulhado em Mel":**
   - **Problema:** O cargueiro de 65.000t perdia 60% da sua energia de rotação por segundo não permitindo manobra solta.
   - **Correção:** Amortecimento de Sway elevado a $0.95$ e Angular re-nivelado a $0.98$ para inércia majestosa duradoura.

---

## 🚀 Novas Implementações Gráficas & Lógicas

* **Painel Dev-Physics Live (UI Flutuante):** UI retrátil no `index.html` permitindo calibrar instantaneamente Massas, Inércia ($I_z$), Thrust Mult, Elasticidade ($k$) e Cargas de Limite da Corda HMPE, sem ter que recompilar Javascript.
* **Cordas Viso-Físicas Estritas:** As antigas cordas curvas de *Catmull-Rom Bézier* foram transformadas. Assim que `Tensão > 10t`, o *Sag* (Catenária Mínima) passa a 0 e desenha uma Reta Rígida amarela. Em estado Crítico ($> 150t$), o cabo transita a Vermelho Incandescente.
* **Whitepaper Científico (`ROPE_PHYSICS.md / physics.html`):** Documentação técnica avançada formalizando e expondo as Leis de Hooke e as Forças Hidrodinâmicas do arrasto trilateral para os futuros Pilotos.

---

## 💡 Lições Aprendidas do Turno

1. **A Simetria das Escaladas Físicas:** Não podemos misturar magnitudes não-escalonadas no código numérico Euler. Misturar limites restritivos perfeitos (Tensão a 200T) e multiplicadores empíricos de fase de rascunhos de dev (Forças de 60 Milhões de Newtons) silencia totalmente a física base. **Tudo precisa habitar na mesma ordem de grandeza.**
2. **"Sag" Visivo Matemático Pode Ser Inverso:** Ao animar molas elásticas, somar *Tensão* ao *Sag* tornava o cabo mais caído com o aumento da força. A modelagem inversa visual é vital para garantir que a GUI reaja de acordo com o cérebro humano (Alta Força = Menor Deformidade).
3. **Poder das Ferramentas UI de Ensaio:** Foram evitadas largas horas de frustração e *reloads* ao ter injetado sliders temporários nas lógicas intermédias. Testar física de fluidos é impossível através de re-compilação rígida. O "DevHUD" foi o herói da noite.

**Feito em Honra ao Cargo de Engenharia Oceânica Brasileira.**
