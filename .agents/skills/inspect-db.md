# Habilidad: Inspección de Base de Datos y Trading
Esta habilidad permite a Antigravity analizar esquemas de bases de datos y registros de trading para optimizar bots y tiendas e-commerce.

## Cuándo usar
- Al depurar errores de sincronización en `useShopify.spec.ts` o servicios de proveedores.
- Al analizar el rendimiento de estrategias de trading en `grid_backtester_ai.py`.

## Instrucciones para el Agente
1. Si se detecta un error de base de datos, utiliza el MCP de PostgreSQL/SQLite para listar tablas.
2. Compara el esquema real con el código en `src/modules/...`.
3. Para trading, consulta los logs de ejecución guardados en la DB para identificar patrones de pérdida.
