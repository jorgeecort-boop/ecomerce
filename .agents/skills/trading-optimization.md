# Habilidad: Optimización de Estrategias de Trading
Esta habilidad guía al agente para realizar ajustes finos en los parámetros de los bots de trading (EMA, Grid, Take Profit).

## Cuándo usar
- Cuando el usuario pide mejorar el "win rate" de un bot.
- Al analizar resultados de backtesting en archivos como `grid_backtester_ai.py`.

## Instrucciones para el Agente
1. Lee los resultados del último backtest.
2. Identifica los periodos de mayor pérdida (drawdown).
3. Propone ajustes en los filtros de tendencia (ej: añadir confirmación en H1).
4. Si el MCP de SQLite está configurado, guarda los resultados para compararlos con versiones anteriores.
