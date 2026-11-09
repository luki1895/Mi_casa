-- Saldo legado stays untouched; new balances are assigned explicitly per client.
ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS saldo_sopas INTEGER
        CHECK (saldo_sopas IS NULL OR saldo_sopas >= 0),
    ADD COLUMN IF NOT EXISTS saldo_segundos INTEGER
        CHECK (saldo_segundos IS NULL OR saldo_segundos >= 0);
